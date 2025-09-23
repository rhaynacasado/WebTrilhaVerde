const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// Lista trilhas e agrega dados das árvores (mesmo que não exista nenhuma)
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        t.nome AS nome,
        COALESCE(COUNT(a.*), 0) AS arvores,
        COALESCE(SUM(CASE WHEN a.ativa THEN 1 ELSE 0 END), 0) AS arvores_ativas,
        COALESCE(SUM(a.quantidade_perguntas), 0) AS perguntas
      FROM trilha t
      LEFT JOIN arvore a
        ON a.trilha_nome = t.nome
      GROUP BY t.nome
      ORDER BY t.nome ASC;
    `);

    res.json(rows.map(r => ({
      nome: r.nome,
      arvores: Number(r.arvores) || 0,
      arvores_ativas: Number(r.arvores_ativas) || 0,
    })));
  } catch (e) {
    console.error('ERRO /api/trilhas:', e);
    res.status(500).json({ error: 'Erro ao listar trilhas' });
  }
});

module.exports = router;

