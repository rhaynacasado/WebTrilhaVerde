const express = require('express');
const router = express.Router();
const { Arvore } = require('../models');

// PUT /api/arvores/:trilha/:codigo  (atualiza nome/especie/foto/ativa)
router.put('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: Number(codigo) } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });

    const { nome, especie, foto_url, ativa } = req.body;
    if (nome !== undefined) arv.nome = nome;
    if (especie !== undefined) arv.especie = especie;
    if (foto_url !== undefined) arv.foto_url = foto_url;
    if (ativa !== undefined) arv.ativa = !!ativa;

    await arv.save();
    res.json(arv.toJSON());
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

// PUT /api/arvores/:trilha/:codigo/toggle-ativa  (opcional)
router.put('/:trilha/:codigo/toggle-ativa', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: Number(codigo) } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });
    arv.ativa = !arv.ativa;
    await arv.save();
    res.json({ ativa: arv.ativa });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

// PUT /api/arvores/:trilha/:codigo/ativa  { ativa: true|false }
router.put('/:trilha/:codigo/ativa', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;

    // aceita boolean em várias formas (true/false, "true"/"false", 1/0)
    function toBool(v) {
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v === 1;
      if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
      return false;
    }
    const ativa = toBool(req.body.ativa);

    const [n] = await Arvore.update(
      { ativa },
      { where: { trilha_nome: trilha, codigo: Number(codigo) } }
    );
    if (n === 0) return res.status(404).json({ error: 'Árvore não encontrada' });

    const after = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: Number(codigo) } });
    res.json({ trilha_nome: after.trilha_nome, codigo: after.codigo, ativa: after.ativa });
  } catch (e) {
    console.error('PUT /api/arvores/:trilha/:codigo/ativa', e);
    res.status(400).json({ error: 'Erro ao alterar status' });
  }
});


// GET /api/arvores?trilha=NomeDaTrilha&ativas=true
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const where = {};
    if (trilha) where.trilha_nome = trilha;
    if (ativas === 'true') where.ativa = true;

    const arvores = await Arvore.findAll({ where, order: [['codigo','ASC']] });
    res.json(arvores);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao listar árvores' });
  }
});

// GET /api/arvores/:trilha/:codigo
router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });
    res.json(arv);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

module.exports = router;
