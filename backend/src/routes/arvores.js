// backend/src/routes/arvores.js
const express = require('express');
const router = express.Router();

const { Arvore } = require('../models');
const auth = require('../middlewares/auth');
const { logArvore } = require('../utils/logHelpers');

// Helper para normalizar boolean
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number')  return v === 1;
  if (typeof v === 'string')  return v.toLowerCase() === 'true' || v === '1';
  return false;
}

/**
 * PUT /api/arvores/:trilha/:codigo
 * Atualiza nome/especie/foto_url/ativa
 */
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });

    const { nome, especie, foto_url, ativa } = req.body;
    if (nome      !== undefined) arv.nome     = nome;
    if (especie   !== undefined) arv.especie  = especie;
    if (foto_url  !== undefined) arv.foto_url = foto_url;
    if (ativa     !== undefined) arv.ativa    = toBool(ativa);

    await arv.save();
    await logArvore(req, trilha, cod); // log após sucesso

    return res.json(arv.toJSON());
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

/**
 * PUT /api/arvores/:trilha/:codigo/toggle-ativa
 * Inverte o status de ativa
 */
router.put('/:trilha/:codigo/toggle-ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });

    arv.ativa = !arv.ativa;
    await arv.save();
    await logArvore(req, trilha, cod);

    return res.json({ ativa: arv.ativa });
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/toggle-ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

/**
 * PUT /api/arvores/:trilha/:codigo/ativa
 * Define ativa = true|false
 */
router.put('/:trilha/:codigo/ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);
    const ativa = toBool(req.body.ativa);

    const [n] = await Arvore.update({ ativa }, { where: { trilha_nome: trilha, codigo: cod } });
    if (n === 0) return res.status(404).json({ error: 'Árvore não encontrada' });

    const after = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    await logArvore(req, trilha, cod);

    return res.json({ trilha_nome: after.trilha_nome, codigo: after.codigo, ativa: after.ativa });
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

/**
 * (Opcional) POST /api/arvores
 * Cria árvore
 */
router.post('/', auth, async (req, res) => {
  try {
    const a = await Arvore.create(req.body);
    await logArvore(req, a.trilha_nome, Number(a.codigo));
    return res.status(201).json(a.toJSON());
  } catch (e) {
    console.error('POST /arvores', e);
    return res.status(400).json({ error: 'Erro ao criar árvore' });
  }
});

/**
 * (Opcional) DELETE /api/arvores/:trilha/:codigo
 * Exclui árvore
 */
router.delete('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    await a.destroy();
    await logArvore(req, trilha, cod);

    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

/** GETs (sem auth) */
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
    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: Number(codigo) } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });
    return res.json(arv);
  } catch (e) {
    console.error('GET /arvores/:trilha/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

module.exports = router;
