const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

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

module.exports = router;

