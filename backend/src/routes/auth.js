// backend/src/routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const multer = require('multer');
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
      res.status(500).json({ error: 'Erro interno' });
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


const crypto = require("crypto");
const nodemailer = require("nodemailer");

// memória só de exemplo (melhor usar tabela ResetTokens no DB)
const resetTokens = new Map();

/** ---------- ESQUECI MINHA SENHA ---------- */
router.post("/forgot-password", [body("email").isEmail()], async (req, res) => {
  if (bad(req, res)) return;
  const email = normEmail(req.body.email);

  try {
    const admin = await Administrador.findByPk(email);
    if (!admin) {
      // sempre responde igual para não revelar cadastro
      return res.json({ message: "Se o e-mail estiver cadastrado, enviaremos instruções." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 15 * 60 * 1000; // 15 min
    resetTokens.set(token, { email, expires });

    const resetUrl = `http://127.0.0.1:5500/frontend/pages/redefinicao.html?token=${token}`; // TODO: ajustar URL conforme deploy

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: '"Trilha Verde" <no-reply@trilhaverde.com>',
      to: email,
      subject: "Trilha Verde: Redefinição de senha",
      html: `<p>Olá, recebemos uma solicitação para redefinir sua senha para Trilha Verde.</p>
             <p>Se você não fez essa solicitação, pode ignorar este e-mail com segurança.</p>
             <hr>
             <p>Clique no link para redefinir sua senha:</p>
             <a href="${resetUrl}">${resetUrl}</a>
             <p>Este link é válido por 15 minutos.</p>
             <p>Atenciosamente,<br>Equipe Trilha Verde</p>
            <img src="http://127.0.0.1:5500/frontend/img/logo.png" alt="Logo Trilha Verde" style="max-width:120px; margin-top:16px;">`, // TODO: ajustar URL conforme deploy
    });

    if (process.env.NODE_ENV !== "production") {
      return res.json({ message: "Link enviado (dev)", resetUrl });
    }

    res.json({ message: "Se o e-mail estiver cadastrado, enviaremos instruções." });
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
