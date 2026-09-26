const express = require('express');
const router = express.Router();
const { sequelize, Trilha } = require('../models');
const auth = require('../middlewares/auth');

// Lista trilhas e agrega dados dos pontos de interesse (mesmo que não exista nenhum)
router.get('/', async (req, res) => {
  try {
    const [rows] = await sequelize.query(`
      SELECT
        t.nome AS nome,
        t.ativa AS ativa,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.ativa = true), 0) AS ativos,
        COALESCE(COUNT(p.codigo), 0) AS total,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.tipo = 'arvore'), 0) AS arvores,
        COALESCE(COUNT(p.codigo) FILTER (WHERE p.tipo = 'predio_historico'), 0) AS predios
      FROM trilha t
      LEFT JOIN ponto_interesse_trilha pit
        ON pit.trilha_nome = t.nome
      LEFT JOIN ponto_interesse p
        ON p.codigo = pit.ponto_interesse_codigo
      GROUP BY t.nome
      ORDER BY t.nome ASC;
    `);

    res.json(rows.map(r => ({
      nome: r.nome,
      ativa: r.ativa !== false,
      quantidade_pontos_interesse: Number(r.ativos) || 0, // lido pelo app mobile
      quantidade_pontos_interesse_total: Number(r.total) || 0,
      quantidade_arvores_tipo: Number(r.arvores) || 0,
      quantidade_predios: Number(r.predios) || 0,
      quantidade_arvores: Number(r.ativos) || 0,
      quantidade_arvores_total: Number(r.total) || 0,
    })));
  } catch (e) {
    console.error('ERRO /api/trilhas:', e);
    res.status(500).json({ error: 'Erro ao listar trilhas' });
  }
});

router.post('/', auth, async (req, res) => {
  const nome = typeof req.body?.nome === 'string' ? req.body.nome.trim() : '';

  if (!nome) {
    return res.status(400).json({ error: 'O nome da trilha é obrigatório' });
  }

  try {
    const existente = await Trilha.findByPk(nome);
    if (existente) {
      return res.status(409).json({ error: 'Já existe uma trilha com esse nome' });
    }

    const trilha = await Trilha.create({ nome });
    return res.status(201).json({
      nome: trilha.nome,
      quantidade_arvores: 0,
      quantidade_arvores_total: 0
    });
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError' || e.original?.code === '23505') {
      return res.status(409).json({ error: 'Já existe uma trilha com esse nome' });
    }
    console.error('ERRO POST /api/trilhas:', e);
    return res.status(500).json({ error: 'Erro ao adicionar trilha' });
  }
});

router.put('/:nome/ativa', auth, async (req, res) => {
  const nome = String(req.params.nome || '').trim();
  const ativa = req.body?.ativa;
  if (typeof ativa !== 'boolean') {
    return res.status(400).json({ error: 'O campo ativa deve ser verdadeiro ou falso' });
  }

  try {
    const [rows] = await sequelize.query(
      `UPDATE trilha SET ativa = $1 WHERE nome = $2 RETURNING nome, ativa`,
      { bind: [ativa, nome] }
    );
    if (!rows.length) return res.status(404).json({ error: 'Trilha não encontrada' });
    return res.json(rows[0]);
  } catch (e) {
    console.error('PUT /api/trilhas/:nome/ativa:', e);
    return res.status(500).json({ error: 'Erro ao alterar status da trilha' });
  }
});

router.put('/:nome/pontos/ordem', auth, async (req, res) => {
  const nome = String(req.params.nome || '').trim();
  const codigos = req.body?.pontos;
  if (!Array.isArray(codigos) || codigos.some(codigo => !Number.isInteger(codigo) || codigo <= 0)) {
    return res.status(400).json({ error: 'A sequência deve conter os códigos dos pontos' });
  }
  if (new Set(codigos).size !== codigos.length) {
    return res.status(400).json({ error: 'A sequência não pode conter pontos duplicados' });
  }

  try {
    await sequelize.transaction(async transaction => {
      const [rows] = await sequelize.query(
        `SELECT ponto_interesse_codigo
         FROM ponto_interesse_trilha
         WHERE trilha_nome = $1
         ORDER BY ordem ASC NULLS LAST, ponto_interesse_codigo ASC
         FOR UPDATE`,
        { bind: [nome], transaction }
      );
      const existentes = rows.map(row => Number(row.ponto_interesse_codigo));
      if (existentes.length !== codigos.length || existentes.some(codigo => !codigos.includes(codigo))) {
        const error = new Error('A lista de pontos mudou. Recarregue a trilha antes de salvar.');
        error.status = 409;
        throw error;
      }

      await sequelize.query(
        `WITH limite AS (
           SELECT GREATEST(COALESCE(MAX(ordem), 0), 0) + $2 AS base
           FROM ponto_interesse_trilha
           WHERE trilha_nome = $1
         ), temporarias AS (
           SELECT pit.ponto_interesse_codigo,
                  (limite.base + ROW_NUMBER() OVER (ORDER BY pit.ordem, pit.ponto_interesse_codigo))::integer AS ordem_temporaria
           FROM ponto_interesse_trilha pit
           CROSS JOIN limite
           WHERE pit.trilha_nome = $1
         )
         UPDATE ponto_interesse_trilha pit
         SET ordem = temporarias.ordem_temporaria
         FROM temporarias
         WHERE pit.trilha_nome = $1
           AND pit.ponto_interesse_codigo = temporarias.ponto_interesse_codigo`,
          { bind: [nome, codigos.length], transaction }
      );

      for (let index = 0; index < codigos.length; index += 1) {
        await sequelize.query(
          `UPDATE ponto_interesse_trilha
           SET ordem = $1
           WHERE trilha_nome = $2 AND ponto_interesse_codigo = $3`,
          { bind: [index + 1, nome, codigos[index]], transaction }
        );
      }
    });
    return res.json({ trilha_nome: nome, pontos: codigos.length });
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ error: e.message });
    console.error('PUT /api/trilhas/:nome/pontos/ordem:', e);
    return res.status(500).json({ error: 'Erro ao salvar a sequência da trilha' });
  }
});

module.exports = router;

