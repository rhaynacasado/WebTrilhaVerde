const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const { Arvore, Pergunta, Trilha, sequelize } = require('../models');
const auth = require('../middlewares/auth');
const { logArvore } = require('../utils/logHelpers');

// ================= HELPERS =================
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

// ================= PUT (EDITAR) =================
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const arv = await loadArvoreOr404(trilha, cod, res);
    if (!arv) return; // loadArvoreOr404 already sent 404

    const { nome, especie, foto_url, ordem } = req.body;
    const latitude = toNumOrNull(req.body.latitude);
    const longitude = toNumOrNull(req.body.longitude);
    const familia = req.body.familia === undefined ? undefined : (String(req.body.familia));
    const origem = req.body.origem === undefined ? undefined : (String(req.body.origem));
    const tipo_origem = req.body.tipo_origem === undefined ? undefined : (String(req.body.tipo_origem));
    const ativa = req.body.ativa === undefined ? undefined : !!req.body.ativa;

    const changed = [];

    if (nome    !== undefined && nome    !== arv.nome)     { arv.nome    = nome;    changed.push('nome'); }
    if (especie !== undefined && especie !== arv.especie)  { arv.especie = especie; changed.push('especie'); }
    if (foto_url!== undefined && foto_url!== arv.foto_url) { arv.foto_url= foto_url;changed.push('foto_url'); }
    if (latitude !== undefined && !sameNum(arv.latitude, latitude)) { arv.latitude = latitude; changed.push('latitude'); }
    if (longitude !== undefined && !sameNum(arv.longitude, longitude)) { arv.longitude = longitude; changed.push('longitude'); }
    if (ativa !== undefined && !!arv.ativa !== ativa) { arv.ativa = ativa; changed.push('ativa'); }
    if (familia !== undefined && String(arv.familia || '') !== String(familia)) { arv.familia = familia; changed.push('familia'); }
    if (origem !== undefined && String(arv.origem || '') !== String(origem)) { arv.origem = origem; changed.push('origem'); }
    if (tipo_origem !== undefined && String(arv.tipo_origem || '') !== String(tipo_origem)) { arv.tipo_origem = tipo_origem; changed.push('tipo_origem'); }

    // ordem lives in arvore_trilha now
    let ordemChanged = false;
    const ordemNum = toNumOrNull(ordem);
    if (ordem !== undefined) {
      const currentOrder = arv.ordem == null ? null : Number(arv.ordem);
      if (!sameNum(currentOrder, ordemNum)) {
        ordemChanged = true;
        changed.push('ordem');
      }
    }

    if (!changed.length && !ordemChanged) {
      return res.json({ unchanged: true, ...arv.toJSON() });
    }

    // persist changes
    await arv.save();

    if (ordemChanged) {
      await sequelize.query(
        `UPDATE arvore_trilha SET ordem = $1 WHERE trilha_nome = $2 AND arvore_codigo = $3`,
        { bind: [ordemNum, trilha, cod] }
      );
      arv.ordem = ordemNum;
    }

    await logArvore(req, trilha, cod, `update:${changed.join(',')}`);

    const out = arv.toJSON();
    out.ordem = arv.ordem;
    out.latitude = arv.latitude;
    out.longitude = arv.longitude;
    out.familia = arv.familia;
    out.origem = arv.origem;
    out.tipo_origem = arv.tipo_origem;
    return res.json(out);
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

// ================= HELPERS INTERNOS =================
async function loadArvoreOr404(trilha, codigo, res) {
  const found = await Arvore.findByPk(Number(codigo), {
    attributes: [
      'codigo', 'nome', 'especie', 'foto_url', 'ativa',
      'familia', 'origem', 'tipo_origem',
      'latitude', 'longitude', 'quantidade_perguntas'
    ]
  });
  if (!found) {
    res.status(404).json({ error: 'Árvore não encontrada' });
    return null;
  }

  // ensure association exists and load ordem
  const [rows] = await sequelize.query(
    `SELECT ordem FROM arvore_trilha WHERE trilha_nome = $1 AND arvore_codigo = $2`,
    { bind: [trilha, Number(codigo)] }
  );

  if (!rows || rows.length === 0) {
    res.status(404).json({ error: 'Árvore não encontrada na trilha' });
    return null;
  }

  found.trilha_nome = trilha;
  found.ordem = rows[0].ordem == null ? null : Number(rows[0].ordem);
  return found;
}

async function isExtremityTree(arvore) {
  if (arvore.ordem == null) return false;

  const [stats] = await sequelize.query(
    `SELECT MIN(ordem) AS min_ordem, MAX(ordem) AS max_ordem
     FROM arvore_trilha
     WHERE trilha_nome = $1 AND ordem IS NOT NULL`,
    { bind: [arvore.trilha_nome] }
  );

  const meta = (stats && stats[0]) || stats || {};
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

// ================= STATUS =================
router.put('/:trilha/:codigo/toggle-ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    return await persistAtivaChange(req, res, trilha, Number(codigo), undefined, 'toggle');
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

router.put('/:trilha/:codigo/ativa', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    return await persistAtivaChange(
      req,
      res,
      trilha,
      Number(codigo),
      toBool(req.body.ativa),
      'set'
    );
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: 'Erro ao alterar status' });
  }
});

// ================= POST (CRIAR) =================
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (!body.trilha_nome || body.codigo == null) {
      return res.status(400).json({ error: 'trilha_nome e codigo são obrigatórios' });
    }

    const created = await Arvore.create({
      codigo: Number(body.codigo),
      nome: body.nome || '',
      especie: body.especie || '',
      foto_url: body.foto_url || '',
      ativa: body.ativa == null ? true : !!body.ativa,
      latitude: toNumOrNull(body.latitude),
      longitude: toNumOrNull(body.longitude),
      familia: body.familia || null,
      origem: body.origem || null,
      tipo_origem: body.tipo_origem || null,
    }, { returning: false });

    // create association in arvore_trilha
    await sequelize.query(
      `INSERT INTO arvore_trilha (trilha_nome, arvore_codigo, ordem) VALUES ($1,$2,$3)` ,
      { bind: [body.trilha_nome, Number(body.codigo), toNumOrNull(body.ordem)] }
    );

    await logArvore(req, body.trilha_nome, Number(body.codigo), `create:"${(created.nome || '').slice(0,80)}"`);

    const out = created.toJSON();
    out.trilha_nome = body.trilha_nome;
    out.ordem = toNumOrNull(body.ordem);
    out.latitude = toNumOrNull(body.latitude);
    out.longitude = toNumOrNull(body.longitude);
    out.familia = body.familia || null;
    out.origem = body.origem || null;
    out.tipo_origem = body.tipo_origem || null;
    return res.status(201).json(out);
  } catch (e) {
    console.error('POST /arvores', e);
    return res.status(400).json({ error: 'Erro ao criar árvore' });
  }
});

// ================= DELETE =================
router.delete('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;

    const cod = Number(codigo);
    // remove association and possibly the arvore row if no other associations remain
    const t = await sequelize.transaction();
    try {
      // fetch name for log
      const [rows] = await sequelize.query(`SELECT nome FROM arvore WHERE codigo = $1`, { bind: [cod], transaction: t });
      const nome = (rows && rows[0] && rows[0].nome) ? rows[0].nome : '';

      const del = await sequelize.query(
        `DELETE FROM arvore_trilha WHERE trilha_nome = $1 AND arvore_codigo = $2`,
        { bind: [trilha, cod], transaction: t }
      );

      const [rem] = await sequelize.query(
        `SELECT COUNT(*)::int AS cnt FROM arvore_trilha WHERE arvore_codigo = $1`,
        { bind: [cod], transaction: t }
      );

      const remaining = rem && rem[0] ? Number(rem[0].cnt) : 0;
      if (remaining === 0) {
        await sequelize.query(`DELETE FROM arvore WHERE codigo = $1`, { bind: [cod], transaction: t });
      }

      await t.commit();

      await logArvore(req, trilha, cod, `delete:"${nome.slice(0,80)}"`);
      return res.status(204).end();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

// ================= GET TOTAL =================
router.get('/total', async (req, res) => {
  try {
    const total = await Trilha.sum('quantidade_arvores');
    return res.json({ total: total || 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao calcular total' });
  }
});

// ================= GET LIST =================
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const replacements = [];
    let whereSql = '';
    if (trilha) { whereSql += ' AND at.trilha_nome = $' + (replacements.push(trilha) ); }
    if (ativas === 'true') { whereSql += ' AND a.ativa = true'; }

    const orderSql = trilha
      ? 'ORDER BY at.ordem ASC NULLS LAST, a.nome ASC'
      : 'ORDER BY a.nome ASC';

    const sql = `
      SELECT at.trilha_nome, at.ordem, a.*
      FROM arvore a
      JOIN arvore_trilha at ON at.arvore_codigo = a.codigo
      WHERE 1=1 ${whereSql}
      ${orderSql}`;

    const [trees] = await sequelize.query(sql, { bind: replacements.length ? replacements : undefined });

    // build counts by joining pergunta -> arvore_trilha to ensure trilha_nome is available
    const countsSql = `
      SELECT at.trilha_nome, p.arvore_codigo, COUNT(p.id)::int AS qtd
      FROM pergunta p
      JOIN arvore_trilha at ON at.arvore_codigo = p.arvore_codigo
      ${trilha ? 'WHERE at.trilha_nome = $1' : ''}
      GROUP BY at.trilha_nome, p.arvore_codigo
    `;

    const countsBind = trilha ? [trilha] : [];
    const [countsRows] = await sequelize.query(countsSql, { bind: countsBind });

    const map = new Map(countsRows.map(c => [`${c.trilha_nome}:${c.arvore_codigo}`, Number(c.qtd)]));

    const out = trees.map(t => ({
      ...t,
      quantidade_perguntas: map.get(`${t.trilha_nome}:${t.codigo}`) || 0
    }));

    return res.json(out);
  } catch (e) {
    console.error('GET /api/arvores error', { error: e && e.stack ? e.stack : e });
    return res.status(500).json({ error: 'Erro ao listar árvores' });
  }
});

// ================= GET ONE =================
router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const a = await loadArvoreOr404(trilha, Number(codigo), res);
    if (!a) return;

    const qtd = await Pergunta.count({
      where: { trilha_nome: trilha, arvore_codigo: Number(codigo) }
    });

    const out = a.toJSON();
    out.quantidade_perguntas = qtd;
    out.ordem = a.ordem;

    return res.json(out);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

  module.exports = router;