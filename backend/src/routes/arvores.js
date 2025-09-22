// backend/src/routes/arvores.js
const express = require('express');
const router = express.Router();

const { Arvore } = require('../models');
const auth = require('../middlewares/auth');
const { logArvore } = require('../utils/logHelpers');

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

/** PUT /api/arvores/:trilha/:codigo */
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const before = { nome: a.nome, especie: a.especie, foto_url: a.foto_url, ativa: a.ativa };
    const { nome, especie, foto_url, ativa } = req.body;

    const changed = [];

    if (nome !== undefined && nome !== a.nome) { a.nome = nome; changed.push('nome'); }
    if (especie !== undefined && especie !== a.especie) { a.especie = especie; changed.push('especie'); }
    if (foto_url !== undefined && foto_url !== a.foto_url) { a.foto_url = foto_url; changed.push('foto_url'); }
    if (ativa !== undefined) {
      const newAtiva = toBool(ativa);
      if (newAtiva !== a.ativa) { a.ativa = newAtiva; changed.push(newAtiva ? 'ativou' : 'desativou'); }
    }

    if (changed.length === 0) {
      // nada mudou -> não salva nem loga
      return res.json({ unchanged: true, ...a.toJSON() });
    }

    await a.save();

    // Detalhe na coluna 'acao'
    let acao;
    if (changed.includes('ativou'))      acao = 'ativou';
    else if (changed.includes('desativou')) acao = 'desativou';
    else if (changed.length)             acao = `update:${changed.join(',')}`;
    else                                 acao = 'update';

    await logArvore(req, trilha, cod, acao);
    return res.json(a.toJSON());
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

/** PUT /api/arvores/:trilha/:codigo/toggle-ativa */
router.put('/:trilha/:codigo/toggle-ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const old = a.ativa;
    a.ativa = !old;
    await a.save();

    await logArvore(req, trilha, cod, old ? 'desativou' : 'ativou');
    return res.json({ ativa: a.ativa });
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/toggle-ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

/** PUT /api/arvores/:trilha/:codigo/ativa  { ativa } */
router.put('/:trilha/:codigo/ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);
    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const newAtiva = toBool(req.body.ativa);
    if (newAtiva === a.ativa) {
      return res.json({ unchanged: true, trilha_nome: a.trilha_nome, codigo: a.codigo, ativa: a.ativa });
    }

    a.ativa = newAtiva;
    await a.save();
    await logArvore(req, trilha, cod, newAtiva ? 'ativou' : 'desativou');

    return res.json({ trilha_nome: a.trilha_nome, codigo: a.codigo, ativa: a.ativa });
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

/** POST /api/arvores */
router.post('/', auth, async (req, res) => {
  try {
    const a = await Arvore.create(req.body);
    await logArvore(req, a.trilha_nome, Number(a.codigo), `create:"${(a.nome || '').slice(0, 80)}"`);
    return res.status(201).json(a.toJSON());
  } catch (e) {
    console.error('POST /arvores', e);
    return res.status(400).json({ error: 'Erro ao criar árvore' });
  }
});

/** DELETE /api/arvores/:trilha/:codigo */
router.delete('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const nome = a.nome || '';
    await a.destroy();
    await logArvore(req, trilha, cod, `delete:"${nome.slice(0, 80)}"`);

    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

/** GETs públicos (inalterados) */
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const where = {};
    if (trilha) where.trilha_nome = trilha;
    if (ativas === 'true') where.ativa = true;

    const arvores = await Arvore.findAll({ where, order: [['codigo','ASC']] });
    return res.json(arvores);
  } catch (e) {
    console.error('GET /arvores', e);
    return res.status(500).json({ error: 'Erro ao listar árvores' });
  }
});

router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: Number(codigo) } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });
    return res.json(a);
  } catch (e) {
    console.error('GET /arvores/:trilha/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

module.exports = router;
