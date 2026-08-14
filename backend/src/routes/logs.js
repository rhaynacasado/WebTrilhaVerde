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
        COALESCE(at.trilha_nome, (
          SELECT trilha_nome FROM arvore_trilha WHERE arvore_codigo = la.arvore_codigo LIMIT 1
        )) AS trilha_nome,
        la.arvore_codigo,
        NULL::int           AS pergunta_id,
        la.admin_email,
        ad.nome             AS admin_nome,
        la.data_alteracao,
        la.acao,
        av.nome             AS arvore_nome,
        NULL::text          AS pergunta_enunciado
      FROM alteracao_arvore la
      LEFT JOIN arvore_trilha at
        ON at.arvore_codigo = la.arvore_codigo
      LEFT JOIN arvore av
        ON av.codigo = at.arvore_codigo
      LEFT JOIN administrador ad
        ON ad.email = la.admin_email

      UNION ALL

      -- PERGUNTAS
      SELECT
        'pergunta'          AS tipo,
        COALESCE(at2.trilha_nome, (
          SELECT trilha_nome FROM arvore_trilha WHERE arvore_codigo = lp.arvore_codigo LIMIT 1
        )) AS trilha_nome,
        lp.arvore_codigo,
        lp.pergunta_id,
        lp.admin_email,
        ad.nome             AS admin_nome,
        lp.data_alteracao,
        lp.acao,
        av.nome             AS arvore_nome,
        pe.enunciado        AS pergunta_enunciado
      FROM alteracao_pergunta lp
      LEFT JOIN arvore_trilha at2
        ON at2.arvore_codigo = lp.arvore_codigo
      LEFT JOIN arvore av
        ON av.codigo = at2.arvore_codigo
      LEFT JOIN pergunta pe
        ON pe.arvore_codigo = lp.arvore_codigo
       AND pe.id = lp.pergunta_id
      LEFT JOIN administrador ad
        ON ad.email = lp.admin_email

      ORDER BY data_alteracao DESC
      LIMIT :limit OFFSET :offset
      `,
      { replacements: { limit, offset } }
    );

    console.debug('GET /api/logs -> rows:', Array.isArray(rows) ? rows.length : 0);
    if (Array.isArray(rows) && rows.length) console.debug('GET /api/logs sample:', rows[0]);
    res.json({ items: rows });
  } catch (e) {
    console.error('GET /api/logs', e);
    res.status(500).json({ error: 'Erro ao listar logs' });
  }
});

module.exports = router;

// DEBUG: contar registros de logs
router.get('/debug-counts', auth, async (req, res) => {
  try {
    const [[{ cnt: arvCnt }]] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM alteracao_arvore`);
    const [[{ cnt: perCnt }]] = await sequelize.query(`SELECT COUNT(*)::int AS cnt FROM alteracao_pergunta`);
    return res.json({ alteracao_arvore: arvCnt || 0, alteracao_pergunta: perCnt || 0 });
  } catch (e) {
    console.error('GET /api/logs/debug-counts', e);
    return res.status(500).json({ error: 'Erro ao contar logs' });
  }
});
