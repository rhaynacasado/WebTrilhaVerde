// backend/src/routes/perguntas.js
const express = require('express');
const router = express.Router();

const { Pergunta } = require('../models');
const auth = require('../middlewares/auth');                // << protege rotas que alteram
const { logPergunta } = require('../utils/logHelpers');     // << registra no histórico

// GET /api/perguntas?trilha=...&arvore=...
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

// GET /api/perguntas/:trilha/:arvore/:id
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

// POST /api/perguntas  (cria; se id não vier, gera próximo por trilha+arvore)
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

    // LOG: criação
    await logPergunta(req, trilha_nome, Number(arvore_codigo), Number(newId));

    res.status(201).json(created.toJSON());
  } catch (e) {
    console.error('POST /perguntas', e);
    res.status(400).json({ error: 'Erro ao criar pergunta' });
  }
});

// PUT /api/perguntas/:trilha/:arvore/:id
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
    for (const f of fields) if (req.body[f] !== undefined) q[f] = req.body[f];

    await q.save();

    // LOG: edição
    await logPergunta(req, trilha, Number(arvore), Number(id));

    res.json(q.toJSON());
  } catch (e) {
    console.error('PUT /perguntas', e);
    res.status(400).json({ error: 'Erro ao atualizar pergunta' });
  }
});

// DELETE /api/perguntas/:trilha/:arvore/:id
router.delete('/:trilha/:arvore/:id', auth, async (req, res) => {
  try {
    const { trilha, arvore, id } = req.params;

    // buscamos antes para poder logar com os mesmos identificadores
    const q = await Pergunta.findOne({
      where: { trilha_nome: trilha, arvore_codigo: Number(arvore), id: Number(id) }
    });
    if (!q) return res.status(404).json({ error: 'Pergunta não encontrada' });

    await q.destroy();

    // LOG: exclusão
    await logPergunta(req, q.trilha_nome, q.arvore_codigo, q.id);

    res.status(204).end();
  } catch (e) {
    console.error('DELETE /perguntas', e);
    res.status(400).json({ error: 'Erro ao excluir pergunta' });
  }
});

module.exports = router;
