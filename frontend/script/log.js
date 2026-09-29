// frontend/script/log.js
(function initLogs() {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
  const logBody = document.querySelector('#logTable tbody');
  if (!logBody) return;

  const token = localStorage.getItem('token');

  fetch(`${API_BASE}/api/logs?limit=100`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })
  .then(r => r.json())
  .then(data => {
    const items = data?.items || [];
    logBody.innerHTML = '';

    if (!items.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>—</td><td>—</td><td>Nenhuma atividade encontrada.</td>`;
      logBody.appendChild(tr);
      return;
    }

    for (const row of items) {
      const tr = document.createElement('tr');

      // data -> local
      const dt = new Date(row.data_alteracao || row.data || Date.now());
      const tdData = document.createElement('td');
      tdData.textContent = dt.toLocaleString('pt-BR');
      tr.appendChild(tdData);

      // nome do admin
      const tdNome = document.createElement('td');
      tdNome.textContent = row.admin_nome || row.admin_email || '—';
      tr.appendChild(tdNome);

      // atividade formatada
      const tdAt = document.createElement('td');
      tdAt.textContent = formatActivity(row);
      tr.appendChild(tdAt);

      logBody.appendChild(tr);
    }
  })
  .catch(err => {
    console.error(err);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>—</td><td>—</td><td>Erro ao carregar logs.</td>`;
    logBody.appendChild(tr);
  });

  function formatActivity(r) {
    const acao = (r.acao || '').toLowerCase();
    const trilha = r.trilha_nome;
    const tipoPonto = r.ponto_tipo === 'predio_historico' ? 'Prédio' : 'Árvore';
    const nomePonto = r.arvore_nome || `${tipoPonto} ${r.ponto_interesse_codigo}`;
    const ponto = `${tipoPonto} “${nomePonto}”`;
    const pergId  = r.pergunta_id;

    // helpers
    const quoted = (s) => (s || '').replace(/^.*?"(.*)".*$/,'$1');
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
      if (acao === 'ativou')    return `Ativou ${ponto} da trilha “${trilha}”.`;
      if (acao === 'desativou') return `Desativou ${ponto} da trilha “${trilha}”.`;
      if (acao.startsWith('create:')) {
        const name = quoted(acao);
        return `Criou ${tipoPonto.toLowerCase()} “${name || nomePonto}” na trilha “${trilha}”.`;
      }
      if (acao.startsWith('delete:')) {
        const name = quoted(acao);
        return `Excluiu ${tipoPonto.toLowerCase()} “${name || nomePonto}” da trilha “${trilha}”.`;
      }
      if (acao.startsWith('update:')) {
        const campos = formatFields(acao.slice(7));
        return `Alterou ${campos} de ${ponto} na trilha “${trilha}”.`;
      }
      return `Alterou ${ponto} da trilha “${trilha}”.`;
    }

    // PERGUNTA
    if (r.tipo === 'pergunta') {
      if (acao.startsWith('create:')) {
        const enunc = quoted(acao) || r.pergunta_enunciado || '';
        return `Criou a pergunta #${pergId}${enunc ? `: “${enunc}”` : ''} para ${ponto} da trilha “${trilha}”.`;
      }
      if (acao.startsWith('delete:')) {
        const enunc = quoted(acao); // snapshot salvo no log
        return `Excluiu a pergunta #${pergId}${enunc ? `: “${enunc}”` : ''} de ${ponto} da trilha “${trilha}”.`;
      }
      if (acao.startsWith('update:')) {
        const campos = formatFields(acao.slice(7));
        return `Alterou ${campos} da pergunta #${pergId} de ${ponto} na trilha “${trilha}”.`;
      }
      return `Alterou a pergunta #${pergId} de ${ponto} da trilha “${trilha}”.`;
    }

    return 'Atividade';
  }
})();
