// backend/src/routes/perguntas.js
const express = require('express');
const router = express.Router();

const { Pergunta } = require('../models');
const auth = require('../middlewares/auth');
const { logPergunta } = require('../utils/logHelpers');

// GETs públicos (inalterados)
router.get('/', async (req, res) => {
  try {
    const { trilha, arvore } = req.query;
    const where = {};
    if (trilha) where.trilha_nome   = trilha;
    if (arvore) where.arvore_codigo = Number(arvore);

    const rows = await Pergunta.findAll({
      where,
      order: [['trilha_nome','ASC'], ['arvore_codigo','ASC'], ['id','ASC']],
      raw: true
    });
    res.json(rows);
  } catch (e) {
    console.error('GET /perguntas', e);
    res.status(500).json({ error: 'Erro ao listar perguntas' });
  }
});

router.get('/:trilha/:arvore/:id', async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;
    const q = await Pergunta.findOne({
      where: { trilha_nome: trilha, arvore_codigo: Number(arvore), id: Number(id) },
      raw: true
    });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });
    res.json(q);
  } catch (e) {
    console.error('GET /perguntas/:trilha/:arvore/:id', e);
    res.status(500).json({ error: 'Erro ao buscar pergunta' });
  }
});

// POST (criar) — gera id se não vier
router.post('/', auth, async (req, res) => {
  try {
    const {
      trilha_nome, arvore_codigo, id,
      enunciado, item_a, item_b, item_c, item_d, item_e,
      texto, audio_url, resposta_correta, dica, audio_dica_url
    } = req.body;

    if (!trilha_nome || !arvore_codigo) {
      return res.status(400).json({ error: 'trilha_nome e arvore_codigo são obrigatórios' });
    }

    let newId = id;
    if (newId == null) {
      const max = await Pergunta.max('id', {
        where: { trilha_nome, arvore_codigo: Number(arvore_codigo) }
      });
      newId = (max || 0) + 1;
    }

    const created = await Pergunta.create({
      trilha_nome,
      arvore_codigo: Number(arvore_codigo),
      id: Number(newId),
      enunciado, item_a, item_b, item_c, item_d, item_e,
      texto, audio_url, resposta_correta, dica, audio_dica_url
    });

    await logPergunta(req, trilha_nome, Number(arvore_codigo), Number(newId),
      `create:"${(enunciado || '').slice(0, 80)}"`);

    res.status(201).json(created.toJSON());
  } catch (e) {
    console.error('POST /perguntas', e);
    res.status(400).json({ error: 'Erro ao criar pergunta' });
  }
});

// PUT (editar) — só salva e loga se algo mudou
router.put('/:trilha/:arvore/:id', auth, async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;
    const q = await Pergunta.findOne({
      where: { trilha_nome: trilha, arvore_codigo: Number(arvore), id: Number(id) }
    });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const fields = [
      'enunciado','item_a','item_b','item_c','item_d','item_e',
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
    await logPergunta(req, trilha, Number(arvore), Number(id), `update:${changed.join(',')}`);

    res.json(q.toJSON());
  } catch (e) {
    console.error('PUT /perguntas', e);
    res.status(400).json({ error: 'Erro ao atualizar pergunta' });
  }
});

// DELETE — grava log com snapshot do enunciado
router.delete('/:trilha/:arvore/:id', auth, async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;
    const q = await Pergunta.findOne({
      where: { trilha_nome: trilha, arvore_codigo: Number(arvore), id: Number(id) }
    });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const enunc = q.enunciado || '';
    await q.destroy();

    await logPergunta(req, trilha, Number(arvore), Number(id), `delete:"${enunc.slice(0, 80)}"`);

    res.status(204).end();
  } catch (e) {
    console.error('DELETE /perguntas', e);
    res.status(400).json({ error: 'Erro ao excluir pergunta' });
  }
});

module.exports = router;
