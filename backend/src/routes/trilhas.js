const express = require('express');
const router = express.Router();
const { sequelize, Trilha } = require('../models');
const auth = require('../middlewares/auth');

// Lista trilhas e agrega dados das árvores (mesmo que não exista nenhuma)
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        t.nome AS nome,
        COALESCE(COUNT(a.codigo), 0) AS quantidade_arvores
      FROM trilha t
      LEFT JOIN arvore_trilha at2
        ON at2.trilha_nome = t.nome
      LEFT JOIN arvore a
        ON a.codigo = at2.arvore_codigo AND a.ativa = true
      GROUP BY t.nome
      ORDER BY t.nome ASC;
    `);

    res.json(rows.map(r => ({
      nome: r.nome,
      quantidade_arvores: Number(r.quantidade_arvores) || 0,
    })));
  } catch (e) {
    console.error('ERRO /api/trilhas:', e);
    res.status(500).json({ error: 'Erro ao listar trilhas' });
  }
});

router.post('/', auth, async (req, res) => {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';

  if (!nome) {
    return res.status(400).json({ error: 'O nome da trilha é obrigatório' });
  }

  try {
    const existente = await Trilha.findByPk(nome);
    if (existente) {
      return res.status(409).json({ error: 'Já existe uma trilha com esse nome' });
    }

    const trilha = await Trilha.create({ nome });
    return res.status(201).json({ nome: trilha.nome, quantidade_arvores: 0 });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError' || e.original?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma trilha com esse nome' });
    }
    console.error('ERRO POST /api/trilhas:', e);
    return res.status(500).json({ error: 'Erro ao adicionar trilha' });
  }
});

module.exports = router;

