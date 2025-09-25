// backend/src/routes/usuarios.js
const express = require('express');
const router = express.Router();

const { Usuario } = require('../models');

// POST /api/usuarios  (criar novo ou 409 se nickname existir)
router.post('/', async (req, res) => {
  try {
    const { nickname, nome, avatar_foto, idade, ano_escolar } = req.body;
    if (!nickname || !nome) {
      return res.status(400).json({ error: 'nickname e nome são obrigatórios' });
    }

    const exists = await Usuario.findByPk(nickname);
    if (exists) return res.status(409).json({ error: 'nickname já cadastrado' });

    const created = await Usuario.create({
      nickname,
      nome,
      avatar_foto: avatar_foto ?? null,
      idade: idade ?? null,
      ano_escolar: ano_escolar ?? null,
      num_arvores_visitadas: 0,
    });

    return res.status(201).json(created.toJSON());
  } catch (e) {
    console.error('POST /usuarios', e);
    return res.status(400).json({ error: 'Erro ao cadastrar usuário' });
  }
});

// GET /api/usuarios/:nickname
router.get('/:nickname', async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.nickname);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });
    return res.json(u.toJSON());
  } catch (e) {
    console.error('GET /usuarios/:nickname', e);
    return res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// PUT /api/usuarios/:nickname  (editar campos)
router.put('/:nickname', async (req, res) => {
  try {
    const u = await Usuario.findByPk(req.params.nickname);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado' });

    const fields = ['nome', 'avatar_foto', 'idade', 'ano_escolar', 'num_arvores_visitadas'];
    const changed = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined && String(req.body[f]) !== String(u[f] ?? '')) {
        u[f] = req.body[f];
        changed.push(f);
      }
    });

    if (changed.length === 0) return res.json({ unchanged: true, ...u.toJSON() });

    await u.save();
    return res.json(u.toJSON());
  } catch (e) {
    console.error('PUT /usuarios/:nickname', e);
    return res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
});

module.exports = router;
