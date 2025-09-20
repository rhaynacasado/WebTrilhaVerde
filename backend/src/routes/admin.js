const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Administrador } = require('../models');
const auth = require('../auth');

function sign(admin) {
  return jwt.sign({ sub: admin.email, nome: admin.nome }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, senha, nome, vinculo } = req.body;
    const exists = await Administrador.findByPk(email);
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' });
    const hash = await bcrypt.hash(senha, 12);
    const admin = await Administrador.create({ email, senha: hash, nome, vinculo });
    res.status(201).json({ token: sign(admin), admin: { email: admin.email, nome: admin.nome, vinculo: admin.vinculo } });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, senha } = req.body;
    const admin = await Administrador.findByPk(email);
    if (!admin) return res.status(401).json({ error: 'Credenciais inválidas' });
    const ok = await bcrypt.compare(senha, admin.senha);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });
    res.json({ token: sign(admin), admin: { email: admin.email, nome: admin.nome, vinculo: admin.vinculo } });
  } catch (e) { next(e); }
});

router.get('/me', auth(), async (req, res, next) => {
  try {
    const a = await Administrador.findByPk(req.admin.email);
    res.json({ email: a.email, nome: a.nome, vinculo: a.vinculo });
  } catch (e) { next(e); }
});

router.put('/me', auth(), async (req, res, next) => {
  try {
    const { nome, vinculo, novaSenha } = req.body;
    const a = await Administrador.findByPk(req.admin.email);
    if (!a) return res.status(404).json({ error: 'Administrador não encontrado' });
    if (nome !== undefined) a.nome = nome;
    if (vinculo !== undefined) a.vinculo = vinculo;
    if (novaSenha) a.senha = await bcrypt.hash(novaSenha, 12);
    await a.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
