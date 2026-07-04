// backend/src/routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Administrador } = require('../models');
const auth = require('../middlewares/auth');

const router = express.Router();

/* helpers */
const sign = (p) => jwt.sign(p, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '1d' });
const normEmail = (s) => String(s || '').trim().toLowerCase();
const bad = (req, res) => {
  const e = validationResult(req);
  if (!e.isEmpty()) { res.status(400).json({ errors: e.array() }); return true; }
  return false;
};

/* upload em memória */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => cb(/image\/(png|jpe?g|gif|webp)/i.test(file.mimetype) ? null : new Error('Arquivo inválido'), /image\/(png|jpe?g|gif|webp)/i.test(file.mimetype))
});

/** ---------- SIGNUP (multipart) ---------- */
router.post(
  '/signup',
  upload.single('avatar'), // campo do form: avatar (opcional)
  [
    body('nome').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('senha').isString().isLength({ min: 6 }),
    body('vinculo').optional().isString(),
  ],
  async (req, res) => {
    if (bad(req, res)) return;
    const email = normEmail(req.body.email);
    const { nome, senha } = req.body;
    const vinculo = typeof req.body.vinculo === 'string' ? req.body.vinculo.trim() : null;

    try {
      const exists = await Administrador.findByPk(email);
      if (exists) return res.status(409).json({ error: 'E-mail já cadastrado' });

      const admin = await Administrador.create({
        email,
        senha,          // hooks do modelo fazem o hash
        nome: nome.trim(),
        vinculo,
        foto: req.file?.buffer || null,
        foto_mime: req.file?.mimetype || null,
      });

      const payload = { email: admin.email, nome: admin.nome, vinculo: admin.vinculo };
      return res.status(201).json({ token: sign(payload), admin: payload });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro interno 8' });
    }
  }
);

/** ---------- LOGIN ---------- */
router.post(
  '/login',
  [body('email').isEmail(), body('senha').isString().isLength({ min: 1 })],
  async (req, res) => {
    if (bad(req, res)) return;
    const { email, senha } = req.body;
    try {
      const admin = await Administrador.findByPk(normEmail(email));
      if (!admin || !(await admin.checkPassword(senha)))
        return res.status(401).json({ error: 'Credenciais inválidas' });

      const payload = { email: admin.email, nome: admin.nome, vinculo: admin.vinculo };
      res.json({ token: sign(payload), admin: payload });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro interno 2' });
    }
  }
);

/** ---------- PERFIL BÁSICO ---------- */
router.get('/me', auth, async (req, res) => {
  try {
    const a = await Administrador.findByPk(req.user.email, {
      attributes: ['email', 'nome', 'vinculo'] // não traz BLOB sem necessidade
    });
    if (!a) return res.status(404).json({ error: 'Administrador não encontrado' });
    res.json({ email: a.email, nome: a.nome, vinculo: a.vinculo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno 3' });
  }
});

/** ---------- ATUALIZAR NOME/VÍNCULO/SENHA ---------- */
router.put(
  '/me',
  auth,
  [
    body('nome').optional().isString().isLength({ min: 2 }),
    body('vinculo').optional().isString().isLength({ min: 1 }),
    body('novaSenha').optional().isString().isLength({ min: 6 }),
  ],
  async (req, res) => {
    if (bad(req, res)) return;
    try {
      const a = await Administrador.findByPk(req.user.email);
      if (!a) return res.status(404).json({ error: 'Administrador não encontrado' });

      const { nome, vinculo, novaSenha } = req.body;
      if (typeof nome === 'string') a.nome = nome.trim();
      if (typeof vinculo === 'string') a.vinculo = vinculo.trim();
      if (typeof novaSenha === 'string' && novaSenha.length >= 6) a.senha = novaSenha; // hook fará hash
      await a.save();

      res.json({ ok: true, nome: a.nome, vinculo: a.vinculo });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Erro interno 4' });
    }
  }
);

/** ---------- BAIXAR FOTO (BYTEA) ---------- */
router.get('/me/avatar', auth, async (req, res) => {
  try {
    const a = await Administrador.findByPk(req.user.email, { attributes: ['foto', 'foto_mime'] });
    if (!a || !a.foto) return res.status(204).end();
    res.setHeader('Content-Type', a.foto_mime || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(a.foto);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao obter avatar' });
  }
});

/** ---------- TROCAR FOTO (multipart) ---------- */
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Envie a imagem no campo "avatar"' });
    const a = await Administrador.findByPk(req.user.email);
    if (!a) return res.status(404).json({ error: 'Administrador não encontrado' });
    a.foto = req.file.buffer;
    a.foto_mime = req.file.mimetype || 'image/jpeg';
    await a.save();
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao salvar avatar' });
  }
});

module.exports = router;

// memória só de exemplo (melhor usar tabela ResetTokens no DB)
const resetTokens = new Map();

const getFrontendBaseUrl = (req) => {
  const referer = req?.headers?.referer;
  if (referer) {
    try {
      const url = new URL(referer);
      const pathname = url.pathname.replace(/\/$/, "");
      if (pathname.includes("/pages/")) {
        const basePath = pathname.slice(0, pathname.lastIndexOf("/pages"));
        return `${url.origin}${basePath}`;
      }
      return `${url.origin}${pathname === "/" ? "" : pathname}`;
    } catch (_err) {
      // fallback abaixo
    }
  }

  const configured = String(process.env.FRONTEND_URL || "http://127.0.0.1:5500/frontend").replace(/\/$/, "");
  return configured;
};

const buildResetUrl = (req, token) => {
  const configured = String(process.env.FRONTEND_URL || "").trim();
  const baseUrl = configured ? configured.replace(/\/$/, "") : getFrontendBaseUrl(req);
  return `${baseUrl}/pages/redefinicao.html?token=${encodeURIComponent(token)}&mode=reset`;
};

const getEmailLogoAttachment = () => {
  const logoPath = path.resolve(__dirname, '../../../frontend/img/logo.png');
  if (!fs.existsSync(logoPath)) return null;

  return {
    filename: 'logo.png',
    path: logoPath,
    cid: 'trilha-verde-logo',
  };
};

/** ---------- ESQUECI MINHA SENHA ---------- */
router.post("/forgot-password", [body("email").isEmail()], async (req, res) => {
  if (bad(req, res)) return;
  const email = normEmail(req.body.email);

  try {
    const admin = await Administrador.findByPk(email);
    if (!admin) {
      return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos instruções." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 15 * 60 * 1000; // 15 minutos
    resetTokens.set(token, { email, expires });

    const resetUrl = buildResetUrl(req, token);
    const smtpUser = String(process.env.SMTP_USER || "").trim();
    const smtpPass = String(process.env.SMTP_PASS || "").replace(/\s+/g, "");
    const canSendMail = Boolean(smtpUser && smtpPass);

    let mailSent = false;

    if (canSendMail) {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      try {
        const logoAttachment = getEmailLogoAttachment();
        const mailOptions = {
          from: '"Trilha Verde" <no-reply@trilhaverde.com>',
          to: email,
          subject: "Trilha Verde: Redefinição de senha",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #ffffff; color: #1f2937;">
              <div style="background: #f7fafc; padding: 24px 32px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 14px;">
                <img src="cid:${logoAttachment?.cid || ''}" alt="Logo Trilha Verde" style="width: 56px; height: 56px; border-radius: 12px; object-fit: cover;">
                <div>
                  <div style="font-size: 18px; font-weight: 700; color: #0f766e;">Trilha Verde</div>
                  <div style="font-size: 13px; color: #6b7280;">Redefinição de senha</div>
                </div>
              </div>
              <div style="padding: 28px 32px 24px;">
                <p style="margin: 0 0 12px; font-size: 16px;">Olá,</p>
                <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no Trilha Verde.</p>
                <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6;">Se você não fez essa solicitação, pode ignorar este e-mail com segurança.</p>
                <div style="margin: 20px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 8px; font-weight: 700;">Redefinir minha senha</a>
                </div>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Ou copie e cole este link no navegador:</p>
                <p style="margin: 0 0 16px; font-size: 13px; word-break: break-all; color: #2563eb;">${resetUrl}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">Este link é válido por 15 minutos.</p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px;">
                  <img src="cid:trilha-verde-avatar" alt="Avatar do remetente" style="width: 46px; height: 46px; border-radius: 50%; object-fit: cover; border: 1px solid #e5e7eb;">
                  <div>
                    <div style="font-size: 14px; font-weight: 700; color: #111827;">Equipe Trilha Verde</div>
                  </div>
                </div>
              </div>
            </div>
          `,
          attachments: [
            ...(logoAttachment ? [logoAttachment] : []),
            {
              filename: 'avatar.png',
              path: path.resolve(__dirname, '../../../frontend/img/avatar.png'),
              cid: 'trilha-verde-avatar',
            },
          ],
        };

        await transporter.sendMail(mailOptions);
        mailSent = true;
      } catch (mailError) {
        console.warn("Falha ao enviar e-mail de recuperação.", mailError.message);
      }
    } else {
      console.warn("SMTP_USER ou SMTP_PASS não definidos; usando modo de desenvolvimento para recuperação de senha.");
    }

    if (mailSent) {
      if (process.env.NODE_ENV !== "production") {
        return res.json({ message: "E-mail enviado com sucesso (dev)", resetUrl, devMode: true, mailSent: true });
      }
      return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos instruções." });
    }

    if (process.env.NODE_ENV !== "production") {
      return res.json({ message: "Link pronto para uso (dev - sem envio)", resetUrl, devMode: true, mailSent: false });
    }

    return res.status(502).json({ error: "Não foi possível enviar o e-mail. Verifique as credenciais SMTP." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno 5" });
  }
});

/** ---------- RESETAR SENHA ---------- */
router.post(
  "/reset-password",
  [body("token").isString(), body("novaSenha").isString().isLength({ min: 6 })],
  async (req, res) => {
    if (bad(req, res)) return;
    const { token, novaSenha } = req.body;

    const entry = resetTokens.get(token);
    if (!entry || entry.expires < Date.now()) {
      return res.status(400).json({ error: "Token inválido ou expirado" });
    }

    try {
      const admin = await Administrador.findByPk(entry.email);
      if (!admin) return res.status(404).json({ error: "Administrador não encontrado" });

      admin.senha = novaSenha; // hook do modelo faz o hash
      await admin.save();

      resetTokens.delete(token); // invalida token usado

      res.json({ ok: true, message: "Senha redefinida com sucesso" });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Erro interno 6" });
    }
  }
);

/** ---------- OBTER DADOS DO USUÁRIO PELO RESET TOKEN ---------- */
router.get("/user-from-reset", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token não fornecido" });

  const entry = resetTokens.get(token);
  if (!entry || entry.expires < Date.now()) {
    return res.status(400).json({ error: "Token inválido ou expirado" });
  }

  try {
    const admin = await Administrador.findByPk(entry.email, {
      attributes: ["nome", "foto", "foto_mime"]
    });

    if (!admin) return res.status(404).json({ error: "Administrador não encontrado" });

    // Converte BLOB da foto para base64 para enviar direto (opcional)
    let fotoUrl = null;
    if (admin.foto) {
      const base64 = admin.foto.toString("base64");
      fotoUrl = `data:${admin.foto_mime || "image/jpeg"};base64,${base64}`;
    }

    res.json({
      nome: admin.nome,
      fotoUrl: fotoUrl || "/img/avatar.png",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Erro interno 7" });
  }
});
