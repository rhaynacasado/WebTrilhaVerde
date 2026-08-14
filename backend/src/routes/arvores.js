const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const auth = require('../middlewares/auth');

// ================= GET LIST =================
router.get('/', async (req, res) => {
  try {
    const { trilha, ativas } = req.query;

    let whereClause = '';
    const replacements = {};

    if (trilha) {
      whereClause += ' AND at2.trilha_nome = :trilha';
      replacements.trilha = trilha;
    }
    if (ativas === 'true') {
      whereClause += ' AND a.ativa = true';
    }

    const [trees] = await sequelize.query(`
      SELECT
        a.codigo,
        a.nome,
        a.especie,
        a.foto_url,
        a.ativa,
        a.pos_x,
        a.pos_y,
        a.latitude,
        a.longitude,
        a.familia,
        a.origem,
        a.tipo_origem,
        at2.trilha_nome,
        at2.ordem,
        COALESCE(pq.qtd, 0) AS quantidade_perguntas
      FROM arvore a
      INNER JOIN arvore_trilha at2 ON at2.arvore_codigo = a.codigo
      LEFT JOIN (
        SELECT arvore_codigo, trilha_nome, COUNT(*) AS qtd
        FROM pergunta
        GROUP BY arvore_codigo, trilha_nome
      ) pq ON pq.arvore_codigo = a.codigo AND pq.trilha_nome = at2.trilha_nome
      WHERE 1=1 ${whereClause}
      ORDER BY at2.ordem ASC
    `, { replacements });

    return res.json(trees.map(t => ({
      trilha_nome: t.trilha_nome,
      codigo: t.codigo,
      nome: t.nome,
      especie: t.especie,
      foto_url: t.foto_url,
      ativa: t.ativa,
      pos_x: t.pos_x,
      pos_y: t.pos_y,
      latitude: t.latitude,
      longitude: t.longitude,
      ordem: t.ordem,
      quantidade_perguntas: Number(t.quantidade_perguntas) || 0,
    })));
  } catch (e) {
    console.error('GET /arvores', e);
    return res.status(500).json({ error: 'Erro ao listar árvores', detalhe: e.message });
  }
});

// ================= GET TOTAL =================
router.get('/total', async (req, res) => {
  try {
    const { trilha } = req.query;
    let whereClause = 'WHERE a.ativa = true';
    const replacements = {};

    if (trilha) {
      whereClause += ' AND at2.trilha_nome = :trilha';
      replacements.trilha = trilha;
    }

    const [[result]] = await sequelize.query(`
      SELECT COUNT(*) AS total
      FROM arvore a
      INNER JOIN arvore_trilha at2 ON at2.arvore_codigo = a.codigo
      ${whereClause}
    `, { replacements });

    return res.json({ total: Number(result.total) || 0 });
  } catch (e) {
    console.error('GET /arvores/total', e);
    return res.status(500).json({ error: 'Erro ao calcular total' });
  }
});

// ================= GET ONE =================
router.get('/:trilha/:codigo', async (req, res) => {
  try {
    const { trilha, codigo } = req.params;

    const [[arvore]] = await sequelize.query(`
      SELECT
        a.codigo,
        a.nome,
        a.especie,
        a.foto_url,
        a.ativa,
        a.pos_x,
        a.pos_y,
        a.latitude,
        a.longitude,
        a.familia,
        a.origem,
        a.tipo_origem,
        at2.trilha_nome,
        at2.ordem,
        COALESCE(pq.qtd, 0) AS quantidade_perguntas
      FROM arvore a
      INNER JOIN arvore_trilha at2
        ON at2.arvore_codigo = a.codigo AND at2.trilha_nome = :trilha
      LEFT JOIN (
        SELECT arvore_codigo, trilha_nome, COUNT(*) AS qtd
        FROM pergunta
        WHERE trilha_nome = :trilha AND arvore_codigo = :codigo
        GROUP BY arvore_codigo, trilha_nome
      ) pq ON pq.arvore_codigo = a.codigo
      WHERE a.codigo = :codigo
    `, { replacements: { trilha, codigo: Number(codigo) } });

    if (!arvore) {
      return res.status(404).json({ error: 'Árvore não encontrada' });
    }

    return res.json({
      trilha_nome: arvore.trilha_nome,
      codigo: arvore.codigo,
      nome: arvore.nome,
      especie: arvore.especie,
      foto_url: arvore.foto_url,
      ativa: arvore.ativa,
      pos_x: arvore.pos_x,
      pos_y: arvore.pos_y,
      latitude: arvore.latitude,
      longitude: arvore.longitude,
      ordem: arvore.ordem,
      quantidade_perguntas: Number(arvore.quantidade_perguntas) || 0,
    });
  } catch (e) {
    console.error('GET /arvores/:trilha/:codigo', e);
    return res.status(500).json({ error: 'Erro ao buscar árvore', detalhe: e.message });
  }
});

// ================= PUT (EDITAR) =================
router.put('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;
    const cod = Number(codigo);
    const { nome, especie, foto_url, ativa, pos_x, pos_y, ordem } = req.body;

    const updates = [];
    const replacements = { trilha, codigo: cod };

    if (nome      !== undefined) { updates.push('nome = :nome');           replacements.nome = nome; }
    if (especie   !== undefined) { updates.push('especie = :especie');     replacements.especie = especie; }
    if (foto_url  !== undefined) { updates.push('foto_url = :foto_url');   replacements.foto_url = foto_url; }
    if (ativa     !== undefined) { updates.push('ativa = :ativa');         replacements.ativa = !!ativa; }
    if (pos_x     !== undefined) { updates.push('pos_x = :pos_x');         replacements.pos_x = pos_x; }
    if (pos_y     !== undefined) { updates.push('pos_y = :pos_y');         replacements.pos_y = pos_y; }

    if (updates.length > 0) {
      await sequelize.query(
        `UPDATE arvore SET ${updates.join(', ')} WHERE codigo = :codigo`,
        { replacements }
      );
    }

    if (ordem !== undefined) {
      await sequelize.query(
        `UPDATE arvore_trilha SET ordem = :ordem
         WHERE trilha_nome = :trilha AND arvore_codigo = :codigo`,
        { replacements: { ordem, trilha, codigo: cod } }
      );
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('PUT /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao atualizar árvore' });
  }
});

// ================= DELETE =================
router.delete('/:trilha/:codigo', auth, async (req, res) => {
  try {
    const { trilha, codigo } = req.params;

    await sequelize.query(
      `DELETE FROM arvore_trilha
       WHERE trilha_nome = :trilha AND arvore_codigo = :codigo`,
      { replacements: { trilha, codigo: Number(codigo) } }
    );

    return res.status(204).end();
  } catch (e) {
    console.error('DELETE /arvores/:trilha/:codigo', e);
    return res.status(400).json({ error: 'Erro ao excluir árvore' });
  }
});

module.exports = router;