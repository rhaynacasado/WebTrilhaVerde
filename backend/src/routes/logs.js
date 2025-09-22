// backend/src/routes/logs.js
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const auth = require('../middlewares/auth'); // se quiser restringir consulta

// GET /api/logs?limit=50&offset=0
router.get('/', auth, async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query.limit || 50), 200);
    const offset = Number(req.query.offset || 0);

    const [rows] = await sequelize.query(
      `
      -- ÁRVORES
      SELECT
        'arvore'            AS tipo,
        la.trilha_nome,
        la.arvore_codigo,
        NULL::int           AS pergunta_id,
        la.admin_email,
        ad.nome             AS admin_nome,
        la.data_alteracao,
        la.acao,
        av.nome             AS arvore_nome,
        NULL::text          AS pergunta_enunciado
      FROM alteracao_arvore la
      LEFT JOIN arvore av
        ON av.trilha_nome = la.trilha_nome AND av.codigo = la.arvore_codigo
      LEFT JOIN administrador ad
        ON ad.email = la.admin_email

      UNION ALL

      -- PERGUNTAS
      SELECT
        'pergunta'          AS tipo,
        lp.trilha_nome,
        lp.arvore_codigo,
        lp.pergunta_id,
        lp.admin_email,
        ad.nome             AS admin_nome,
        lp.data_alteracao,
        lp.acao,
        av.nome             AS arvore_nome,
        pe.enunciado        AS pergunta_enunciado
      FROM alteracao_pergunta lp
      LEFT JOIN arvore av
        ON av.trilha_nome = lp.trilha_nome AND av.codigo = lp.arvore_codigo
      LEFT JOIN pergunta pe
        ON pe.trilha_nome = lp.trilha_nome
       AND pe.arvore_codigo = lp.arvore_codigo
       AND pe.id = lp.pergunta_id
      LEFT JOIN administrador ad
        ON ad.email = lp.admin_email

      ORDER BY data_alteracao DESC
      LIMIT :limit OFFSET :offset
      `,
      { replacements: { limit, offset } }
    );

    res.json({ items: rows });
  } catch (e) {
    console.error('GET /api/logs', e);
    res.status(500).json({ error: 'Erro ao listar logs' });
  }
});

module.exports = router;
