// backend/src/routes/dashboard.js
const express = require('express');
const router = express.Router();

const { sequelize, Usuario, Trilha, Arvore, Pergunta } = require('../models');

function formatActivity(r) {
  const acaoOriginal = String(r.acao || '');
  const acao = acaoOriginal.toLowerCase();
  const tipoPonto = r.ponto_tipo === 'predio_historico' ? 'Prédio' : 'Árvore';
  const nomePonto = r.alvo_nome || `${tipoPonto} ${r.ponto_interesse_codigo}`;
  const ponto = `${tipoPonto} “${nomePonto}”`;
  const quoted = (value) => String(value || '').replace(/^.*?"(.*)".*$/, '$1');
  const formatFields = (fields) => {
    const labels = {
      nome: 'Nome', qrcode_url: 'Link do QR Code', latitude: 'Latitude', longitude: 'Longitude',
      ativa: 'Status', a_especie: 'Espécie', a_familia: 'Família', a_origem: 'Origem',
      a_tipo_origem: 'Tipo de origem', p_descricao: 'Descrição', p_construcao: 'Construção',
      ordem: 'Posição', enunciado: 'Enunciado', item_a: 'Alternativa A', item_b: 'Alternativa B',
      item_c: 'Alternativa C', item_d: 'Alternativa D', texto: 'Texto informativo',
      audio_url: 'Áudio informativo', resposta_correta: 'Resposta correta', dica: 'Dica',
      audio_dica_url: 'Áudio da dica'
    };
    return fields.split(',').map(field => labels[field.trim()] || field.trim().replaceAll('_', ' ')).join(', ');
  };

  if (r.tipo === 'arvore') {
    if (acao === 'ativou' || acao === 'toggle_on') return `Ativou ${ponto} da trilha “${r.trilha_nome}”.`;
    if (acao === 'desativou' || acao === 'toggle_off') return `Desativou ${ponto} da trilha “${r.trilha_nome}”.`;
    if (acao.startsWith('create')) return `Criou ${tipoPonto.toLowerCase()} “${quoted(acaoOriginal) || nomePonto}” na trilha “${r.trilha_nome}”.`;
    if (acao.startsWith('delete')) return `Excluiu ${tipoPonto.toLowerCase()} “${quoted(acaoOriginal) || nomePonto}” da trilha “${r.trilha_nome}”.`;
    if (acao.startsWith('update:')) return `Alterou ${formatFields(acao.slice(7))} de ${ponto} na trilha “${r.trilha_nome}”.`;
    return `Alterou ${ponto} da trilha “${r.trilha_nome}”.`;
  }

  if (acao.startsWith('create')) return `Criou a pergunta #${r.pergunta_id}${quoted(acaoOriginal) ? `: “${quoted(acaoOriginal)}”` : ''} para ${ponto} na trilha “${r.trilha_nome}”.`;
  if (acao.startsWith('delete')) return `Excluiu a pergunta #${r.pergunta_id}${quoted(acaoOriginal) ? `: “${quoted(acaoOriginal)}”` : ''} de ${ponto} na trilha “${r.trilha_nome}”.`;
  if (acao.startsWith('update:')) return `Alterou ${formatFields(acao.slice(7))} da pergunta #${r.pergunta_id} de ${ponto} na trilha “${r.trilha_nome}”.`;
  return `Alterou a pergunta #${r.pergunta_id} de ${ponto} na trilha “${r.trilha_nome}”.`;
}

// GET /api/dashboard/summary
router.get('/summary', async (req, res) => {
  try {
    const [usuarios, trilhas, arvores, predios, perguntas] = await Promise.all([
      Usuario.count(),
      Trilha.count(),
      Arvore.count({ where: { tipo: 'arvore' } }),
      Arvore.count({ where: { tipo: 'predio_historico' } }),
      Pergunta.count(),
    ]);

    const [active] = await Promise.all([Arvore.count({ where: { ativa: true, tipo: 'arvore' } })]);
    const percent = arvores ? Math.round((active / arvores) * 100) : 0;

    // últimas 5 atividades, já “formatadas”
        const [rows] = await sequelize.query(`
          SELECT 'arvore' AS tipo, at.trilha_nome AS trilha_nome, a.ponto_interesse_codigo, NULL::int AS pergunta_id,
              COALESCE(arv.nome,'') AS alvo_nome, arv.tipo AS ponto_tipo, a.admin_email, ad.nome AS admin_nome, a.data_alteracao, a.acao
          FROM alteracao_ponto_interesse a
          LEFT JOIN ponto_interesse_trilha at ON at.ponto_interesse_codigo = a.ponto_interesse_codigo
          LEFT JOIN ponto_interesse arv ON arv.codigo = at.ponto_interesse_codigo
            LEFT JOIN administrador ad ON ad.email = a.admin_email
          UNION ALL
          SELECT 'pergunta' AS tipo, at2.trilha_nome AS trilha_nome, p.ponto_interesse_codigo, p.pergunta_id,
              COALESCE(arv2.nome,'') AS alvo_nome, arv2.tipo AS ponto_tipo, p.admin_email, ad.nome AS admin_nome, p.data_alteracao, p.acao
          FROM alteracao_pergunta p
          LEFT JOIN ponto_interesse_trilha at2 ON at2.ponto_interesse_codigo = p.ponto_interesse_codigo
          LEFT JOIN ponto_interesse arv2 ON arv2.codigo = at2.ponto_interesse_codigo
            LEFT JOIN administrador ad ON ad.email = p.admin_email
          ORDER BY data_alteracao DESC
          LIMIT 5
        `);

    const activities = rows.map(r => ({
      quando: r.data_alteracao,
      quemEmail: r.admin_email,
      quemNome: r.admin_nome,
      atividade: formatActivity(r),
    }));

    res.json({
      kpis: { usuarios, trilhas, arvores, predios, perguntas },
      donut: { percent },       // << % de árvores ativas
      activities,               // << só 5 itens, já prontos pra exibir
    });
  } catch (err) {
    console.error('GET /api/dashboard/summary', err);
    res.status(500).json({ error: 'Falha ao montar dashboard' });
  }
});

module.exports = router;
