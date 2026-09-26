const express = require('express');
const router = express.Router();
const { sequelize, Trilha } = require('../models');
const auth = require('../middlewares/auth');

// Lista trilhas e agrega dados dos pontos de interesse (mesmo que não exista nenhum)
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        t.nome AS nome,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.ativa = true), 0) AS ativos,
        COALESCE(COUNT(p.codigo), 0) AS total,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.tipo = 'arvore'), 0) AS arvores,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.tipo = 'predio_historico'), 0) AS predios
      FROM trilha t
      LEFT JOIN ponto_interesse_trilha pit
        ON pit.trilha_nome = t.nome
      LEFT JOIN ponto_interesse p
        ON p.codigo = pit.ponto_interesse_codigo
      GROUP BY t.nome
      ORDER BY t.nome ASC;
    `);

    res.json(rows.map(r => ({
      nome: r.nome,
      quantidade_pontos_interesse: Number(r.ativos) || 0, // lido pelo app mobile
      quantidade_pontos_interesse_total: Number(r.total) || 0,
      quantidade_arvores_tipo: Number(r.arvores) || 0,
      quantidade_predios: Number(r.predios) || 0,
      quantidade_arvores: Number(r.ativos) || 0,
      quantidade_arvores_total: Number(r.total) || 0,
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
    return res.status(201).json({
      nome: trilha.nome,
      quantidade_arvores: 0,
      quantidade_arvores_total: 0
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError' || e.original?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma trilha com esse nome' });
    }
    console.error('ERRO POST /api/trilhas:', e);
    return res.status(500).json({ error: 'Erro ao adicionar trilha' });
  }
});

module.exports = router;

