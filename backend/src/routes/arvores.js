const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');

const { Arvore, Pergunta, Trilha, sequelize } = require('../models');
const auth = require('../middlewares/auth');
const { logArvore } = require('../utils/logHelpers');

function resourceType(req) {
  return req.baseUrl.endsWith('predios') ? 'predio_historico' : 'arvore';
}

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

// detect column name for imagens primary key (some DBs use different names)
const IMAGE_ID_CANDIDATES = ['id', 'codigo', 'imagem_codigo', 'imagem_id'];
let imagemIdColumnCache = null;
async function detectImagemIdColumn() {
  if (imagemIdColumnCache) return imagemIdColumnCache;
  const candidatesList = IMAGE_ID_CANDIDATES.map(c => `'${c}'`).join(',');
  const sql = `SELECT column_name FROM information_schema.columns WHERE table_name='imagens' AND column_name IN (${candidatesList}) LIMIT 1`;
  try {
    const [rows] = await sequelize.query(sql);
    imagemIdColumnCache = rows && rows[0] && rows[0].column_name ? rows[0].column_name : null;
  } catch (e) {
    imagemIdColumnCache = null;
  }
  return imagemIdColumnCache;
}

function imageIdExpression(idColumn) {
  return idColumn ? `${idColumn} AS id` : 'url AS id';
}

// ================= GET LIST =================
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const tipo = req.query.tipo || resourceType(req);
    const replacements = [];
    let whereSql = ` AND p.tipo = $${replacements.push(tipo)}`;
    if (trilha) { whereSql += ' AND at.trilha_nome = $' + (replacements.push(trilha) ); }
    if (ativas === 'true') { whereSql += ' AND p.ativa = true'; }

    const orderSql = trilha
      ? 'ORDER BY at.ordem ASC NULLS LAST, p.nome ASC'
      : 'ORDER BY p.nome ASC';

    const sql = `
            SELECT at.trilha_nome, at.ordem, p.codigo, p.nome, p.tipo, p.qrcode_url,
              p.ativa,
              CASE WHEN p.tipo = 'arvore' THEN p.a_especie END AS especie,
              CASE WHEN p.tipo = 'arvore' THEN p.a_familia END AS familia,
              CASE WHEN p.tipo = 'arvore' THEN p.a_origem END AS origem,
              CASE WHEN p.tipo = 'arvore' THEN p.a_tipo_origem END AS tipo_origem,
              p.latitude, p.longitude
            FROM ponto_interesse p
            JOIN ponto_interesse_trilha at ON at.ponto_interesse_codigo = p.codigo
      WHERE 1=1 ${whereSql}
      ${orderSql}`;

    const [trees] = await sequelize.query(sql, { bind: replacements.length ? replacements : undefined });

    // build counts by joining pergunta -> ponto_interesse_trilha
    const countsSql = `
      SELECT at.trilha_nome, p.ponto_interesse_codigo, COUNT(p.id)::int AS qtd
      FROM pergunta p
      JOIN ponto_interesse_trilha at ON at.ponto_interesse_codigo = p.ponto_interesse_codigo
      ${trilha ? 'WHERE at.trilha_nome = $1' : ''}
      GROUP BY at.trilha_nome, p.ponto_interesse_codigo
    `;

    const countsBind = trilha ? [trilha] : [];
    const [countsRows] = await sequelize.query(countsSql, { bind: countsBind });

    const map = new Map(countsRows.map(c => [`${c.trilha_nome}:${c.ponto_interesse_codigo}`, Number(c.qtd)]));

    const out = trees.map(t => ({
      ...t,
      quantidade_perguntas: map.get(`${t.trilha_nome}:${t.codigo}`) || 0,
      tipo
    }));

    return res.json(out);
  } catch (e) {
    console.error('GET /api/arvores error', { error: e && e.stack ? e.stack : e });
    return res.status(500).json({ error: 'Erro ao listar árvores' });
  }
});

// ================= GET TOTAL =================
router.get('/total', async (req, res) => {
  try {
    const tipo = req.query.tipo || resourceType(req);
    const [[{ total }]] = await sequelize.query(
      `SELECT COUNT(DISTINCT p.codigo)::int AS total
       FROM ponto_interesse p WHERE p.tipo = $1`, { bind: [tipo] }
    );
    return res.json({ total: total || 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao calcular total' });
  }
});

// ================= HELPERS INTERNOS =================
async function loadArvoreOr404(trilha, codigo, res) {
  const tipo = res.req.baseUrl.endsWith('predios') ? 'predio_historico' : 'arvore';
  const found = await Arvore.findByPk(Number(codigo), {
    attributes: [
      'codigo', 'nome', 'especie', 'ativa',
      'familia', 'origem', 'tipo_origem',
      'latitude', 'longitude', 'tipo', 'quantidade_perguntas', 'qrcode_url'
    ]
  });
  if (!found || found.tipo !== tipo) {
    res.status(404).json({ error: 'Ponto de interesse não encontrado' });
    return null;
  }

  // ensure association exists and load ordem
  const [rows] = await sequelize.query(
    `SELECT pit.ordem FROM ponto_interesse_trilha pit
     JOIN ponto_interesse p ON p.codigo = pit.ponto_interesse_codigo
     WHERE pit.trilha_nome = $1 AND pit.ponto_interesse_codigo = $2 AND p.tipo = $3`,
    { bind: [trilha, Number(codigo), res.req.baseUrl.endsWith('predios') ? 'predio_historico' : 'arvore'] }
  );

  if (!rows || rows.length === 0) {
    res.status(404).json({ error: 'Ponto de interesse não encontrado na trilha' });
    return null;
  }

  found.trilha_nome = trilha;
  found.ordem = rows[0].ordem == null ? null : Number(rows[0].ordem);
  return found;
}

// ================= GET ÁRVORE ÚNICA =================
router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const arv = await loadArvoreOr404(trilha, codigo, res);
    if (!arv) return; // loadArvoreOr404 already sent 404

    return res.json(arv);
  } catch (e) {
    console.error('GET /arvores/:trilha/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar árvore' });
  }
});

async function isExtremityTree(arvore) {
  if (arvore.ordem == null) return false;

  const [stats] = await sequelize.query(
    `SELECT MIN(ordem) AS min_ordem, MAX(ordem) AS max_ordem
    FROM ponto_interesse_trilha pit
    JOIN ponto_interesse p ON p.codigo = pit.ponto_interesse_codigo
    WHERE pit.trilha_nome = $1 AND pit.ordem IS NOT NULL AND p.tipo = $2`,
      { bind: [arvore.trilha_nome, arvore.tipo] }
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

// ================= PUT (EDITAR) =================
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);

    const arv = await loadArvoreOr404(trilha, cod, res);
    if (!arv) return; // loadArvoreOr404 already sent 404

    const { nome, especie, ordem } = req.body;
    const isTree = resourceType(req) === 'arvore';
    const latitude = toNumOrNull(req.body.latitude);
    const longitude = toNumOrNull(req.body.longitude);
    const familia = req.body.familia === undefined ? undefined : (String(req.body.familia));
    const origem = req.body.origem === undefined ? undefined : (String(req.body.origem));
    const tipo_origem = req.body.tipo_origem === undefined ? undefined : (String(req.body.tipo_origem));
    const ativa = req.body.ativa === undefined ? undefined : !!req.body.ativa;

    const changed = [];

    if (nome    !== undefined && nome    !== arv.nome)     { arv.nome    = nome;    changed.push('nome'); }
    if (isTree && especie !== undefined && especie !== arv.especie)  { arv.especie = especie; changed.push('a_especie'); }
    if (latitude !== undefined && !sameNum(arv.latitude, latitude)) { arv.latitude = latitude; changed.push('latitude'); }
    if (longitude !== undefined && !sameNum(arv.longitude, longitude)) { arv.longitude = longitude; changed.push('longitude'); }
    if (ativa !== undefined && !!arv.ativa !== ativa) { arv.ativa = ativa; changed.push('ativa'); }
    if (isTree && familia !== undefined && String(arv.familia || '') !== String(familia)) { arv.familia = familia; changed.push('a_familia'); }
    if (isTree && origem !== undefined && String(arv.origem || '') !== String(origem)) { arv.origem = origem; changed.push('a_origem'); }
    if (isTree && tipo_origem !== undefined && String(arv.tipo_origem || '') !== String(tipo_origem)) { arv.tipo_origem = tipo_origem; changed.push('a_tipo_origem'); }

    // ordem lives in ponto_interesse_trilha now
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
        `UPDATE ponto_interesse_trilha SET ordem = $1 WHERE trilha_nome = $2 AND ponto_interesse_codigo = $3`,
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

// ================= POST (CRIAR) =================
router.post('/', auth, async (req, res) => {
  try {
    const body = { ...req.body };

    if (!body.trilha_nome) {
      return res.status(400).json({ error: 'trilha_nome é obrigatório' });
    }

    const isTree = resourceType(req) === 'arvore';
    let codigo = body.codigo == null ? null : Number(body.codigo);
    if (codigo == null || !Number.isInteger(codigo)) {
      const [[row]] = await sequelize.query(
        'SELECT COALESCE(MAX(codigo), 0) + 1 AS codigo FROM ponto_interesse'
      );
      codigo = Number(row.codigo);
    }
    const created = await Arvore.create({
      codigo,
      nome: body.nome || '',
      ativa: body.ativa == null ? true : !!body.ativa,
      latitude: toNumOrNull(body.latitude),
      longitude: toNumOrNull(body.longitude),
      ...(isTree ? {
        especie: body.especie || '',
        familia: body.familia || null,
        origem: body.origem || null,
        tipo_origem: body.tipo_origem || null,
      } : {}),
      tipo: body.tipo || resourceType(req),
    }, { returning: false });

    // create association in ponto_interesse_trilha
    await sequelize.query(
      `INSERT INTO ponto_interesse_trilha (trilha_nome, ponto_interesse_codigo, ordem) VALUES ($1,$2,$3)` ,
      { bind: [body.trilha_nome, codigo, toNumOrNull(body.ordem)] }
    );

    await logArvore(req, body.trilha_nome, codigo, `create:"${(created.nome || '').slice(0,80)}"`);

    const out = created.toJSON();
    out.trilha_nome = body.trilha_nome;
    out.codigo = codigo;
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

    await sequelize.query(
      `DELETE FROM ponto_interesse_trilha
       WHERE trilha_nome = :trilha AND ponto_interesse_codigo = :codigo`,
      { replacements: { trilha, codigo: Number(codigo) } }
    );

    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

// ================= IMAGENS (CRUD) =================
// List imagens
router.get('/:trilha/:codigo/images', async (req, res) => {
  try {
    const codigo = Number(req.params.codigo);
    const idColumn = await detectImagemIdColumn();
    const [imgs] = await sequelize.query(
      `SELECT ${imageIdExpression(idColumn)}, url, legenda, fonte FROM imagens WHERE ponto_interesse_codigo = $1 ORDER BY url ASC`,
      { bind: [codigo] }
    );
    return res.json(imgs || []);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao listar imagens' });
  }
});

// Create imagem
router.post('/:trilha/:codigo/images', auth, async (req, res) => {
  try {
    const codigo = Number(req.params.codigo);
    const { url, legenda, fonte } = req.body;
    if (!url) return res.status(400).json({ error: 'url é obrigatório' });

    const idColumn = await detectImagemIdColumn();
    const [result] = await sequelize.query(
      `INSERT INTO imagens (ponto_interesse_codigo, url, legenda, fonte) VALUES ($1,$2,$3,$4) RETURNING ${imageIdExpression(idColumn)}, url, legenda, fonte`,
      { bind: [codigo, String(url), legenda || null, fonte || null] }
    );
    const created = result && result[0] ? result[0] : null;
    return res.status(201).json(created || {});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao criar imagem' });
  }
});

// Update imagem
router.put('/:trilha/:codigo/images/:id', auth, async (req, res) => {
  try {
    const codigo = Number(req.params.codigo);
    const idColumn = await detectImagemIdColumn();
    const id = idColumn ? Number(req.params.id) : decodeURIComponent(req.params.id);
    const { url, legenda, fonte } = req.body;

    // ensure belongs to this tree
    const [found] = await sequelize.query(
      `SELECT ${imageIdExpression(idColumn)} FROM imagens WHERE ${idColumn ? `${idColumn} = $1` : 'url = $1'} AND ponto_interesse_codigo = $2`,
      { bind: [id, codigo] }
    );
    if (!found || !found[0]) return res.status(404).json({ error: 'Imagem não encontrada' });

    await sequelize.query(
      `UPDATE imagens SET url = $1, legenda = $2, fonte = $3 WHERE ${idColumn ? `${idColumn} = $4` : 'url = $4 AND ponto_interesse_codigo = $5'}`,
      { bind: idColumn ? [String(url || ''), legenda || null, fonte || null, id] : [String(url || ''), legenda || null, fonte || null, id, codigo] }
    );

    const [rows] = await sequelize.query(
      `SELECT ${imageIdExpression(idColumn)}, url, legenda, fonte FROM imagens WHERE ${idColumn ? `${idColumn} = $1` : 'url = $1 AND ponto_interesse_codigo = $2'}`,
      { bind: idColumn ? [id] : [String(url || ''), codigo] }
    );
    return res.json(rows && rows[0] ? rows[0] : {});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao atualizar imagem' });
  }
});

// Delete imagem
router.delete('/:trilha/:codigo/images/:id', auth, async (req, res) => {
  try {
    const codigo = Number(req.params.codigo);
    const idColumn = await detectImagemIdColumn();
    const id = idColumn ? Number(req.params.id) : decodeURIComponent(req.params.id);
    await sequelize.query(
      `DELETE FROM imagens WHERE ${idColumn ? `${idColumn} = $1` : 'url = $1 AND ponto_interesse_codigo = $2'}`,
      { bind: idColumn ? [id] : [id, codigo] }
    );
    return res.status(204).end();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erro ao excluir imagem' });
  }
});

module.exports = router;
