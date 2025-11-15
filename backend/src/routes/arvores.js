// backend/src/routes/arvores.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

// [ALTERADO] Adicionamos o modelo 'Trilha' para a nova rota
const { Arvore, Pergunta, Trilha, sequelize } = require('../models');
const auth = require('../middlewares/auth');
const { logArvore } = require('../utils/logHelpers');

// --------- helpers ----------
function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}
function toNumOrNull(v) {
  if (v === undefined) return undefined;
  if (v === '' || v == null) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
const sameNum = (a, b) =>
  (a == null && b == null) || (Number(a) === Number(b));

// ---------------------------------------------
// PUT /api/arvores/:trilha/:codigo  (editar)
// ... (toda a sua lógica de PUT, POST, DELETE continua aqui, intacta)
// ---------------------------------------------
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const arv = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!arv) return res.status(404).json({ error: 'Árvore não encontrada' });

    const { nome, especie, foto_url, ordem } = req.body;
    const pos_x = toNumOrNull(req.body.pos_x);
    const pos_y = toNumOrNull(req.body.pos_y);
    const ativa = req.body.ativa === undefined ? undefined : !!req.body.ativa;

    const changed = [];

    if (nome    !== undefined && nome    !== arv.nome)     { arv.nome    = nome;    changed.push('nome'); }
    if (especie !== undefined && especie !== arv.especie)  { arv.especie = especie; changed.push('especie'); }
    if (foto_url!== undefined && foto_url!== arv.foto_url) { arv.foto_url= foto_url;changed.push('foto_url'); }
    if (pos_x !== undefined && !sameNum(arv.pos_x, pos_x)) { arv.pos_x = pos_x; changed.push('pos_x'); }
    if (pos_y !== undefined && !sameNum(arv.pos_y, pos_y)) { arv.pos_y = pos_y; changed.push('pos_y'); }
    if (ativa !== undefined && !!arv.ativa !== ativa) { arv.ativa = ativa; changed.push('ativa'); }
    if (ordem !== undefined && !sameNum(arv.ordem, ordem)) { arv.ordem = ordem; changed.push('ordem'); }
    
    if (changed.length === 0) {
      return res.json({ unchanged: true, ...arv.toJSON() });
    }

    await arv.save();
    await logArvore(req, trilha, cod, `update:${changed.join(',')}`);

    return res.json(arv.toJSON());
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

async function loadArvoreOr404(trilha, codigo, res) {
  const found = await Arvore.findOne({ where: { trilha_nome: trilha, codigo } });
  if (!found) {
    res.status(404).json({ error: 'Árvore não encontrada' });
    return null;
  }
  return found;
}

async function isExtremityTree(arvore) {
  if (arvore.ordem == null) return false;

  const stats = await Arvore.findAll({
    attributes: [
      [sequelize.fn('MIN', sequelize.col('ordem')), 'min_ordem'],
      [sequelize.fn('MAX', sequelize.col('ordem')), 'max_ordem'],
    ],
    where: {
      trilha_nome: arvore.trilha_nome,
      ordem: { [Op.ne]: null },
    },
    raw: true,
    limit: 1,
  });

  const meta = stats[0] || {};
  const min = meta.min_ordem == null ? null : Number(meta.min_ordem);
  const max = meta.max_ordem == null ? null : Number(meta.max_ordem);
  if (min == null && max == null) return false;

  const ordemAtual = Number(arvore.ordem);
  return (min != null && ordemAtual === min) || (max != null && ordemAtual === max);
}

async function persistAtivaChange(req, res, trilha, codigo, novaFlag, logPrefix) {
  const arvore = await loadArvoreOr404(trilha, codigo, res);
  if (!arvore) return null;

  const atual  = !!arvore.ativa;
  const target = novaFlag !== undefined ? !!novaFlag : !atual;

  if (atual === target) {
    return res.json({
      unchanged: true,
      trilha_nome: arvore.trilha_nome,
      codigo: arvore.codigo,
      ativa: arvore.ativa,
    });
  }

  if (atual && !target) {
    const isExtremity = await isExtremityTree(arvore);
    if (isExtremity) {
      return res.status(400).json({
        error: 'Não é permitido desativar a primeira ou a última árvore da trilha.',
      });
    }
  }

  arvore.ativa = target;

  await arvore.save();
  const logSufix = arvore.ativa ? 'ativou' : 'desativou';
  await logArvore(req, trilha, codigo, `${logPrefix}:${logSufix}`);

  return res.json({
    trilha_nome: arvore.trilha_nome,
    codigo: arvore.codigo,
    ativa: arvore.ativa,
  });
}

router.put('/:trilha/:codigo/toggle-ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);
    return await persistAtivaChange(req, res, trilha, cod, undefined, 'toggle');
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/toggle-ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

router.put('/:trilha/:codigo/ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);
    const newAtiva = toBool(req.body.ativa);
    return await persistAtivaChange(
      req,
      res,
      trilha,
      cod,
      newAtiva,
      'set'
    );
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo/ativa', e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (!body.trilha_nome || body.codigo == null) {
      return res.status(400).json({ error: 'trilha_nome e codigo são obrigatórios' });
    }

    const created = await Arvore.create({
      trilha_nome: body.trilha_nome,
      codigo:      Number(body.codigo),
      nome:        body.nome || '',
      especie:     body.especie || '',
      foto_url:    body.foto_url || '',
      ativa:       body.ativa == null ? true : !!body.ativa,
      pos_x:       toNumOrNull(body.pos_x),
      pos_y:       toNumOrNull(body.pos_y),
    });

    await logArvore(req, created.trilha_nome, Number(created.codigo), `create:"${(created.nome || '').slice(0,80)}"`);
    return res.status(201).json(created.toJSON());
  } catch (e) {
    console.error('POST /arvores', e);
    return res.status(400).json({ error: 'Erro ao criar árvore' });
  }
});

router.delete('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const a = await Arvore.findOne({ where: { trilha_nome: trilha, codigo: cod } });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const nome = a.nome || '';
    await a.destroy();

    await logArvore(req, trilha, cod, `delete:"${nome.slice(0,80)}"`);
    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

// ---------------------------------------------
// GETs públicos
// ---------------------------------------------

// [NOVO] ROTA PARA O APLICATIVO CALCULAR O TOTAL DE ÁRVORES
router.get('/total', async (req, res) => {
  try {
    const total = await Trilha.sum('quantidade_arvores');
    return res.status(200).json({ total: total || 0 });
  } catch (e) {
    console.error('GET /arvores/total', e);
    return res.status(500).json({ error: 'Erro ao calcular o total de árvores' });
  }
});

// GET /api/arvores  (com contagem) - ROTA DO SEU SITE
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const where = {};
    if (trilha) where.trilha_nome = trilha;
    if (ativas === 'true') where.ativa = true;

    // 1) árvores
    const trees = await Arvore.findAll({
      where,
      order: [['codigo', 'ASC']],
      raw: true
    });

    // 2) contagem de perguntas por árvore
    const counts = await Pergunta.findAll({
      attributes: [
        'trilha_nome',
        'arvore_codigo',
        [sequelize.fn('COUNT', sequelize.col('id')), 'qtd']
      ],
      group: ['trilha_nome', 'arvore_codigo'],
      raw: true
    });

    // 3) junta
    const map = new Map(
      counts.map(c => [`${c.trilha_nome}:${c.arvore_codigo}`, Number(c.qtd)])
    );

    const out = trees.map(t => ({
      ...t,
      quantidade_perguntas: map.get(`${t.trilha_nome}:${t.codigo}`) || 0
    }));

    return res.json(out);
  } catch (e) {
    console.error('GET /arvores', e);
    return res.status(500).json({ error: 'Erro ao listar árvores' });
  }
});

router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const a = await Arvore.findOne({
      where: { trilha_nome: trilha, codigo: Number(codigo) }
    });
    if (!a) return res.status(404).json({ error: 'Árvore não encontrada' });

    const qtd = await Pergunta.count({
      where: { trilha_nome: trilha, arvore_codigo: Number(codigo) }
    });

    const out = a.toJSON();
    out.quantidade_perguntas = qtd;

    return res.json(out);
  } catch (e) {
    console.error('GET /arvores/:trilha/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

module.exports = router;
