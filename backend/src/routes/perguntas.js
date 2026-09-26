// backend/src/routes/perguntas.js
const express = require('express');
const router = express.Router();

const { Pergunta, sequelize } = require('../models'); // <- precisa do sequelize exportado
const auth = require('../middlewares/auth');
const { logPergunta } = require('../utils/logHelpers');

// ==================== GETs públicos ====================

// ?ponto=<codigo> (app mobile)  ?trilha=<nome>
router.get('/', async (req, res) => {
  try {
    const { ponto, trilha } = req.query;

    const binds = [];
    let whereSql = '';
    if (ponto) { binds.push(Number(ponto)); whereSql += ` AND p.ponto_interesse_codigo = $${binds.length}`; }
    if (trilha) {
      binds.push(trilha);
      whereSql += ` AND EXISTS (SELECT 1 FROM ponto_interesse_trilha pit
                                WHERE pit.ponto_interesse_codigo = p.ponto_interesse_codigo
                                  AND pit.trilha_nome = $${binds.length})`;
    }

    const sql = `
            SELECT p.id, p.ponto_interesse_codigo,
              p.enunciado, p.item_a, p.item_b, p.item_c, p.item_d,
             p.texto, p.audio_url, p.resposta_correta, p.dica, p.audio_dica_url
      FROM pergunta p
      WHERE 1=1 ${whereSql}
      ORDER BY p.ponto_interesse_codigo ASC, p.id ASC
    `;

    const [rows] = await sequelize.query(sql, { bind: binds });
    return res.json(rows);
  } catch (e) {
    console.error('GET /perguntas', e);
    res.status(500).json({ error: 'Erro ao listar perguntas' });
  }
});

router.get('/:trilha/:arvore/:id', async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;

    // ensure the association exists
    const [assoc] = await sequelize.query(
      `SELECT 1 FROM ponto_interesse_trilha WHERE trilha_nome = $1 AND ponto_interesse_codigo = $2 LIMIT 1`,
      { bind: [trilha, Number(arvore)] }
    );
    if (!assoc || assoc.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const qSql = `
      SELECT p.id, p.ponto_interesse_codigo, p.enunciado, p.item_a, p.item_b, p.item_c, p.item_d,
             p.texto, p.audio_url, p.resposta_correta, p.dica, p.audio_dica_url,
             $1::text AS trilha_nome
      FROM pergunta p
      WHERE p.ponto_interesse_codigo = $2 AND p.id = $3
      LIMIT 1
    `;
    const [rows] = await sequelize.query(qSql, { bind: [trilha, Number(arvore), Number(id)] });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('GET /perguntas/:trilha/:arvore/:id', e);
    res.status(500).json({ error: 'Erro ao buscar pergunta' });
  }
});

// ==================== Mutations (com auth) ====================

// POST (criar) — gera id sequencial por (trilha, arvore) dentro de transação
router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      trilha_nome, ponto_interesse_codigo, id,
      enunciado, item_a, item_b, item_c, item_d,
      texto, audio_url, resposta_correta, dica, audio_dica_url
    } = req.body;

    const pontoCodigo = ponto_interesse_codigo;
    if (!pontoCodigo) {
      await t.rollback();
      return res.status(400).json({ error: 'ponto_interesse_codigo é obrigatório' });
    }

    let newId = id;
    if (newId == null) {
      const max = await Pergunta.max('id', {
        where: { ponto_interesse_codigo: Number(pontoCodigo) },
        transaction: t
      });
      newId = (max || 0) + 1;
    }

    const created = await Pergunta.create({
      ponto_interesse_codigo: Number(pontoCodigo),
      id: Number(newId),
      enunciado, item_a, item_b, item_c, item_d,
      texto, audio_url, resposta_correta, dica, audio_dica_url
    }, { transaction: t });

    await t.commit();

    // Log de criação (best-effort)
    try {
      // try to determine trilha for logging: prefer provided trilha_nome, otherwise take first assoc
      let trilhaForLog = trilha_nome;
      if (!trilhaForLog) {
        const [rows] = await sequelize.query(
          `SELECT trilha_nome FROM ponto_interesse_trilha WHERE ponto_interesse_codigo = $1 LIMIT 1`,
          { bind: [Number(pontoCodigo)] }
        );
        if (rows && rows[0]) trilhaForLog = rows[0].trilha_nome;
      }
      if (trilhaForLog) {
        await logPergunta(
          req,
          trilhaForLog,
          Number(pontoCodigo),
          Number(newId),
          `create:"${(enunciado || '').slice(0, 80)}"`
        );
      }
    } catch (logErr) {
      console.warn('Falha ao registrar log de criação:', logErr.message);
    }

    return res.status(201).json(created.toJSON());
  } catch (e) {
    await t.rollback();
    console.error('POST /perguntas', e);
    return res
      .status(400)
      .json({ error: e?.original?.detail || e.message || 'Erro ao criar pergunta' });
  }
});

// PUT (editar) — só salva/loga se algo mudou
router.put('/:trilha/:arvore/:id', auth, async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;

    // ensure association exists
    const [assoc] = await sequelize.query(
      `SELECT 1 FROM ponto_interesse_trilha WHERE trilha_nome = $1 AND ponto_interesse_codigo = $2 LIMIT 1`,
      { bind: [trilha, Number(arvore)] }
    );
    if (!assoc || assoc.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const q = await Pergunta.findOne({ where: { ponto_interesse_codigo: Number(arvore), id: Number(id) } });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const fields = [
      'enunciado','item_a','item_b','item_c','item_d',
      'texto','audio_url','resposta_correta','dica','audio_dica_url'
    ];
    const changed = [];
    for (const f of fields) {
      if (req.body[f] !== undefined && req.body[f] !== q[f]) {
        q[f] = req.body[f];
        changed.push(f);
      }
    }

    if (changed.length === 0) {
      return res.json({ unchanged: true, ...q.toJSON() });
    }

    await q.save();

    // Log de atualização (best-effort)
    try {
      await logPergunta(
        req,
        trilha,
        Number(arvore),
        Number(id),
        `update:${changed.join(',')}`
      );
    } catch (logErr) {
      console.warn('Falha ao registrar log de atualização:', logErr.message);
    }

    return res.json(q.toJSON());
  } catch (e) {
    console.error('PUT /perguntas', e);
    return res.status(400).json({ error: 'Erro ao atualizar pergunta' });
  }
});

// DELETE — sem log (para evitar conflitos de FK)
router.delete('/:trilha/:arvore/:id', auth, async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;

    // ensure association exists
    const [assoc] = await sequelize.query(
      `SELECT 1 FROM ponto_interesse_trilha WHERE trilha_nome = $1 AND ponto_interesse_codigo = $2 LIMIT 1`,
      { bind: [trilha, Number(arvore)] }
    );
    if (!assoc || assoc.length === 0) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const q = await Pergunta.findOne({ where: { ponto_interesse_codigo: Number(arvore), id: Number(id) } });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });

    await q.destroy();
    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /perguntas', e);
    return res.status(400).json({ error: 'Erro ao excluir pergunta' });
  }
});

module.exports = router;
