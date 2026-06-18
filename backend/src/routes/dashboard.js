// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();

const { sequelize, Administrador, Trilha, Arvore, Pergunta } = require('../models');

function formatActivity(r) {
  // Mensagens no mesmo estilo do /log
  if (r.tipo === 'arvore') {
    if (r.acao === 'toggle_on')  return `Ativou a árvore "${r.alvo_nome}" (Trilha "${r.trilha_nome}").`;
    if (r.acao === 'toggle_off') return `Desativou a árvore "${r.alvo_nome}" (Trilha "${r.trilha_nome}").`;
    if (r.acao === 'create')     return `Criou a árvore "${r.alvo_nome}" (Trilha "${r.trilha_nome}").`;
    if (r.acao === 'delete')     return `Excluiu a árvore código ${r.arvore_codigo} (Trilha "${r.trilha_nome}").`;
    // update:* (campos)
    return `Alterou a árvore "${r.alvo_nome}" (Trilha "${r.trilha_nome}").`;
  } else {
    if (r.acao === 'create')     return `Criou a pergunta #${r.pergunta_id} em "${r.alvo_nome}" (Trilha "${r.trilha_nome}").`;
    if (r.acao?.startsWith('update'))
      return `Alterou a pergunta #${r.pergunta_id} (árvore ${r.arvore_codigo}) da trilha "${r.trilha_nome}".`;
    return `Alterou a pergunta #${r.pergunta_id} (árvore ${r.arvore_codigo}) da trilha "${r.trilha_nome}".`;
  }
}

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const [usuarios, trilhas, arvores, perguntas] = await Promise.all([
      Administrador.count(),
      Trilha.count(),
      Arvore.count(),
      Pergunta.count(),
    ]);

    const [active] = await Promise.all([Arvore.count({ where: { ativa: true } })]);
    const percent = arvores ? Math.round((active / arvores) * 100) : 0;

    // últimas 5 atividades, já “formatadas”
        const [rows] = await sequelize.query(`
          SELECT 'arvore' AS tipo, at.trilha_nome AS trilha_nome, a.arvore_codigo, NULL::int AS pergunta_id,
            COALESCE(arv.nome,'') AS alvo_nome, a.admin_email, a.data_alteracao, a.acao
          FROM alteracao_arvore a
          LEFT JOIN arvore_trilha at ON at.arvore_codigo = a.arvore_codigo
          LEFT JOIN arvore arv ON arv.codigo = at.arvore_codigo
          UNION ALL
          SELECT 'pergunta' AS tipo, at2.trilha_nome AS trilha_nome, p.arvore_codigo, p.pergunta_id,
            COALESCE(arv2.nome,'') AS alvo_nome, p.admin_email, p.data_alteracao, p.acao
          FROM alteracao_pergunta p
          LEFT JOIN arvore_trilha at2 ON at2.arvore_codigo = p.arvore_codigo
          LEFT JOIN arvore arv2 ON arv2.codigo = at2.arvore_codigo
          ORDER BY data_alteracao DESC
          LIMIT 5
        `);

    const activities = rows.map(r => ({
      quando: r.data_alteracao,
      quemEmail: r.admin_email,
      atividade: formatActivity(r),
    }));

    res.json({
      kpis: { usuarios, trilhas, arvores, perguntas },
      donut: { percent },       // << % de árvores ativas
      activities,               // << só 5 itens, já prontos pra exibir
    });
  } catch (err) {
    console.error('GET /api/dashboard/summary', err);
    res.status(500).json({ error: 'Falha ao montar dashboard' });
  }
});

module.exports = router;
