// backend/src/routes/pontosInteresse.js
// Rotas de leitura usadas pelo aplicativo mobile (tabela ponto_interesse)
const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');

// colunas devolvidas com os mesmos nomes do banco
const SELECT_PONTO = `
  p.codigo, p.nome, p.tipo, p.qrcode_url, p.ativa,
  p.a_especie, p.a_familia, p.a_origem, p.a_tipo_origem,
  p.latitude, p.longitude,
  (SELECT COUNT(*)::int FROM pergunta q WHERE q.ponto_interesse_codigo = p.codigo) AS quantidade_perguntas`;

// GET /api/pontos-interesse?trilha=<nome>&ativas=true
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const binds = [];
    let whereSql = '';
    if (trilha) { binds.push(trilha); whereSql += ` AND pit.trilha_nome = $${binds.length}`; }
    if (ativas === 'true') whereSql += ' AND p.ativa = true';

    const [rows] = await sequelize.query(`
      SELECT pit.trilha_nome, pit.ordem, ${SELECT_PONTO}
      FROM ponto_interesse p
      JOIN ponto_interesse_trilha pit ON pit.ponto_interesse_codigo = p.codigo
      WHERE 1=1 ${whereSql}
      ORDER BY ${trilha ? 'pit.ordem ASC, p.nome ASC' : 'p.nome ASC, pit.trilha_nome ASC'}`,
      { bind: binds }
    );
    return res.json(rows);
  } catch (e) {
    console.error('GET /api/pontos-interesse', e);
    return res.status(500).json({ error: 'Erro ao listar pontos de interesse' });
  }
});

// GET /api/pontos-interesse/total?trilha=<nome>&ativas=true
router.get('/total', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;
    const binds = [];
    let whereSql = '';
    if (trilha) { binds.push(trilha); whereSql += ` AND pit.trilha_nome = $${binds.length}`; }
    if (ativas === 'true') whereSql += ' AND p.ativa = true';

    const [[{ total }]] = await sequelize.query(`
      SELECT COUNT(DISTINCT p.codigo)::int AS total
      FROM ponto_interesse p
      ${trilha ? 'JOIN ponto_interesse_trilha pit ON pit.ponto_interesse_codigo = p.codigo' : ''}
      WHERE 1=1 ${whereSql}`,
      { bind: binds }
    );
    return res.json({ total: total || 0 });
  } catch (e) {
    console.error('GET /api/pontos-interesse/total', e);
    return res.status(500).json({ error: 'Erro ao calcular total' });
  }
});

// GET /api/pontos-interesse/:codigo
router.get('/:codigo(\\d+)', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT ${SELECT_PONTO} FROM ponto_interesse p WHERE p.codigo = $1`,
      { bind: [Number(req.params.codigo)] }
    );
    if (!rows.length) return res.status(404).json({ error: 'Ponto de interesse não encontrado' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('GET /api/pontos-interesse/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar ponto de interesse' });
  }
});

// GET /api/pontos-interesse/:codigo/imagens
router.get('/:codigo(\\d+)/imagens', async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT ponto_interesse_codigo, url, legenda, fonte
       FROM imagens WHERE ponto_interesse_codigo = $1 ORDER BY url ASC`,
      { bind: [Number(req.params.codigo)] }
    );
    return res.json(rows);
  } catch (e) {
    console.error('GET /api/pontos-interesse/:codigo/imagens', e);
    return res.status(500).json({ error: 'Erro ao listar imagens' });
  }
});

module.exports = router;
