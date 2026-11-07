const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const path = require('path');
const { Administrador, AdministradorConvite, sequelize } = require('../models');
const auth = require('../middlewares/auth');
const superadmin = require('../middlewares/superadmin');

const router = express.Router();
const validTypes = ['superadmin', 'padrao'];
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');

function getInvitationOrigin(req) {
  const origin = String(process.env.FRONTEND_URL || req.get('origin') || '').trim().replace(/\/+$/, '');
  if (!origin || !/^https?:\/\//i.test(origin)) {
    const error = new Error('Configure FRONTEND_URL para enviar convites.');
    error.status = 503;
    throw error;
  }
  return origin;
}

async function sendInvitationEmail(email, token, origin) {
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!smtpUser || !smtpPass) {
    const error = new Error('O envio de convites não está configurado no servidor.');
    error.status = 503;
    throw error;
  }

  const inviteUrl = `${origin}/pages/cadastro.html?token=${encodeURIComponent(token)}`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: smtpUser, pass: smtpPass },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"Trilha Verde" <${smtpUser}>`,
    to: email,
    subject: 'Convite para o Trilha Verde',
    text: `Você foi convidado para cadastrar seu perfil de administrador no Trilha Verde. Acesse ${inviteUrl}. O convite é válido por 24 horas.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff; color: #1f2937;">
        <div style="background: #f7fafc; padding: 24px 32px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-size: 20px; font-weight: 700; color: #0f766e;">Trilha Verde</div>
          <div style="font-size: 13px; color: #6b7280; margin-top: 4px;">Convite para administrador</div>
        </div>
        <div style="padding: 28px 32px 24px;">
          <p style="margin: 0 0 12px; font-size: 16px;">Olá,</p>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">Você foi convidado para criar seu perfil de administrador no Trilha Verde.</p>
          <div style="margin: 20px 0;">
            <a href="${inviteUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700;">Cadastrar meu perfil</a>
          </div>
          <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Ou copie e cole este link no navegador:</p>
          <p style="margin: 0 0 16px; font-size: 13px; word-break: break-all; color: #2563eb;">${inviteUrl}</p>
          <p style="margin: 0; font-size: 13px; color: #6b7280;">Este convite é válido por 24 horas.</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <img src="cid:trilha-verde-logo" alt="Logo Trilha Verde" style="width: 64px; height: 64px; object-fit: contain;">
            <div style="margin-top: 8px; font-size: 14px; font-weight: 700; color: #111827;">Equipe Trilha Verde</div>
          </div>
        </div>
      </div>
    `,
    attachments: [{
      filename: 'logo.png',
      path: path.resolve(__dirname, '../../../frontend/img/logo.png'),
      cid: 'trilha-verde-logo',
    }],
  });
}

router.use(auth, superadmin);

router.get('/', async (_req, res) => {
  try {
    const [admins, invitations] = await Promise.all([
      Administrador.findAll({
        attributes: ['email', 'nome', 'tipo'],
        order: [['email', 'ASC']],
      }),
      AdministradorConvite.findAll({ attributes: ['email', 'expires_at'] }),
    ]);
    const pendingInvitations = new Map(invitations.map(invitation => [invitation.email, invitation.expires_at]));

    return res.json({
      admins: admins.map(admin => ({
        email: admin.email,
        nome: admin.nome,
        tipo: admin.tipo,
        perfilPendente: pendingInvitations.has(admin.email),
        conviteExpirado: pendingInvitations.has(admin.email) && new Date(pendingInvitations.get(admin.email)) <= new Date(),
      })),
    });
  } catch (error) {
    console.error('Falha ao listar administradores:', error);
    if (['42P01', '42703'].includes(error.original?.code)) {
      return res.status(503).json({
        error: 'O banco ainda não tem as tabelas/colunas da gestão de administradores. Aplique a migração backend/migrations/20261107000000_admin_types_and_invitations.sql.',
      });
    }
    return res.status(500).json({ error: 'Não foi possível carregar os administradores' });
  }
});

router.post(
  '/',
  [
    body('email').isEmail().withMessage('Informe um e-mail válido.'),
    body('tipo').isIn(validTypes).withMessage('Tipo de administrador inválido.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = normalizeEmail(req.body.email);
    const { tipo } = req.body;
    const smtpUser = String(process.env.SMTP_USER || '').trim();
    const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    if (!smtpUser || !smtpPass) {
      return res.status(503).json({ error: 'O envio de convites não está configurado no servidor.' });
    }

    let origin;
    try {
      origin = getInvitationOrigin(req);
    } catch (error) {
      return res.status(error.status).json({ error: error.message });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    let createdAdmin;

    try {
      await sequelize.transaction(async transaction => {
        const existing = await Administrador.findByPk(email, { transaction });
        if (existing) {
          const error = new Error('Este e-mail já está cadastrado.');
          error.status = 409;
          throw error;
        }

        createdAdmin = await Administrador.create({
          email,
          nome: email,
          senha: crypto.randomBytes(32).toString('hex'),
          tipo,
        }, { transaction });
        await AdministradorConvite.create({
          email,
          token_hash: hashToken(token),
          expires_at: expiresAt,
        }, { transaction });
      });
    } catch (error) {
      if (error.status === 409 || error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      }
      console.error('Falha ao criar convite de administrador:', error);
      return res.status(500).json({ error: 'Não foi possível criar o convite.' });
    }

    try {
      await sendInvitationEmail(email, token, origin);
    } catch (error) {
      console.error('Falha ao enviar convite de administrador:', error);
      try {
        await sequelize.transaction(async transaction => {
          await AdministradorConvite.destroy({ where: { email }, transaction });
          await Administrador.destroy({ where: { email }, transaction });
        });
      } catch (cleanupError) {
        console.error('Falha ao remover administrador sem convite enviado:', cleanupError);
        return res.status(500).json({ error: 'O e-mail falhou e não foi possível cancelar o convite. Contate o suporte.' });
      }
      return res.status(502).json({ error: 'Não foi possível enviar o convite. Verifique a configuração de e-mail.' });
    }

    return res.status(201).json({
      admin: { email: createdAdmin.email, nome: createdAdmin.nome, tipo, perfilPendente: true },
      message: 'Convite enviado por e-mail.',
    });
  }
);

router.post('/:email/invitation', async (req, res) => {
  const email = normalizeEmail(req.params.email);
  let origin;
  try {
    origin = getInvitationOrigin(req);
  } catch (error) {
    return res.status(error.status).json({ error: error.message });
  }

  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  if (!smtpUser || !smtpPass) {
    return res.status(503).json({ error: 'O envio de convites não está configurado no servidor.' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const nextExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
  let previousInvitation;
  try {
    await sequelize.transaction(async transaction => {
      const admin = await Administrador.findByPk(email, { transaction });
      if (!admin) {
        const error = new Error('Administrador não encontrado.');
        error.status = 404;
        throw error;
      }

      const invitation = await AdministradorConvite.findByPk(email, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!invitation) {
        const error = new Error('Este administrador já concluiu o cadastro.');
        error.status = 409;
        throw error;
      }

      previousInvitation = {
        token_hash: invitation.token_hash,
        expires_at: invitation.expires_at,
      };
      invitation.token_hash = hashToken(token);
      invitation.expires_at = nextExpiration;
      await invitation.save({ transaction });
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('Falha ao atualizar convite de administrador:', error);
    return res.status(500).json({ error: 'Não foi possível atualizar o convite.' });
  }

  try {
    await sendInvitationEmail(email, token, origin);
  } catch (error) {
    console.error('Falha ao reenviar convite de administrador:', error);
    try {
      await AdministradorConvite.update(previousInvitation, { where: { email } });
    } catch (restoreError) {
      console.error('Falha ao restaurar convite anterior:', restoreError);
      return res.status(500).json({ error: 'O e-mail falhou e não foi possível restaurar o convite anterior.' });
    }
    return res.status(error.status || 502).json({ error: error.status ? error.message : 'Não foi possível enviar o convite.' });
  }

  return res.json({ message: 'Convite reenviado por e-mail.' });
});

router.put(
  '/:email/tipo',
  [body('tipo').isIn(validTypes).withMessage('Tipo de administrador inválido.')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const email = normalizeEmail(req.params.email);
    if (email === normalizeEmail(req.user.email)) {
      return res.status(400).json({ error: 'Não é possível alterar o próprio tipo de administrador.' });
    }

    try {
      const updated = await sequelize.transaction(async transaction => {
        await Administrador.findAll({
          attributes: ['email'],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const admin = await Administrador.findByPk(email, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!admin) {
          const error = new Error('Administrador não encontrado.');
          error.status = 404;
          throw error;
        }

        if (admin.tipo === 'superadmin' && req.body.tipo !== 'superadmin') {
          const count = await Administrador.count({ where: { tipo: 'superadmin' }, transaction });
          if (count <= 1) {
            const error = new Error('Não é possível rebaixar o último superadministrador.');
            error.status = 409;
            throw error;
          }
        }

        admin.tipo = req.body.tipo;
        await admin.save({ transaction });
        return { email: admin.email, nome: admin.nome, tipo: admin.tipo };
      });
      return res.json({ admin: updated });
    } catch (error) {
      if (error.status) return res.status(error.status).json({ error: error.message });
      console.error('Falha ao alterar tipo de administrador:', error);
      return res.status(500).json({ error: 'Não foi possível alterar o tipo do administrador.' });
    }
  }
);

router.delete('/:email', async (req, res) => {
  const email = normalizeEmail(req.params.email);
  if (email === normalizeEmail(req.user.email)) {
    return res.status(400).json({ error: 'Não é possível remover a própria conta.' });
  }

  try {
    await sequelize.transaction(async transaction => {
      await Administrador.findAll({
        attributes: ['email'],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const admin = await Administrador.findByPk(email, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!admin) {
        const error = new Error('Administrador não encontrado.');
        error.status = 404;
        throw error;
      }

      if (admin.tipo === 'superadmin') {
        const count = await Administrador.count({ where: { tipo: 'superadmin' }, transaction });
        if (count <= 1) {
          const error = new Error('Não é possível remover o último superadministrador.');
          error.status = 409;
          throw error;
        }
      }

      await admin.destroy({ transaction });
    });
    return res.json({ ok: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(409).json({ error: 'Este administrador possui alterações vinculadas e não pode ser removido.' });
    }
    console.error('Falha ao remover administrador:', error);
    return res.status(500).json({ error: 'Não foi possível remover o administrador.' });
  }
});

module.exports = router;
