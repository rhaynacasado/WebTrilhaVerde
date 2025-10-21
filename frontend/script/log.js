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
    const arvNome = r.arvore_nome || `árvore ${r.arvore_codigo}`;
    const pergId  = r.pergunta_id;

    // helpers
    const quoted = (s) => (s || '').replace(/^.*?"(.*)".*$/,'$1');

    if (r.tipo === 'arvore') {
      if (acao === 'ativou')    return `Ativou a árvore “${arvNome}” da trilha “${trilha}”.`;
      if (acao === 'desativou') return `Desativou a árvore “${arvNome}” da trilha “${trilha}”.`;
      if (acao.startsWith('create:')) {
        const name = quoted(acao);
        return `Criou a árvore “${name || arvNome}” na trilha “${trilha}”.`;
      }
      if (acao.startsWith('delete:')) {
        const name = quoted(acao);
        return `Excluiu a árvore “${name || arvNome}” da trilha “${trilha}”.`;
      }
      if (acao.startsWith('update:')) {
        const campos = acao.slice(7);
        return `Alterou ${campos.replaceAll('_',' ')} da árvore “${arvNome}” na trilha “${trilha}”.`;
      }
      return `Alterou a árvore “${arvNome}” da trilha “${trilha}”.`;
    }

    // PERGUNTA
    if (r.tipo === 'pergunta') {
      if (acao.startsWith('create:')) {
        const enunc = quoted(acao) || r.pergunta_enunciado || '';
        return `Criou a pergunta #${pergId}${enunc ? `: “${enunc}”` : ''} (árvore ${r.arvore_codigo}) da trilha “${trilha}”.`;
      }
      if (acao.startsWith('delete:')) {
        const enunc = quoted(acao); // snapshot salvo no log
        return `Excluiu a pergunta #${pergId}${enunc ? `: “${enunc}”` : ''} (árvore ${r.arvore_codigo}) da trilha “${trilha}”.`;
      }
      if (acao.startsWith('update:')) {
        const campos = acao.slice(7);
        return `Alterou ${campos.replaceAll('_',' ')} da pergunta #${pergId} (árvore ${r.arvore_codigo}) da trilha “${trilha}”.`;
      }
      return `Alterou a pergunta #${pergId} (árvore ${r.arvore_codigo}) da trilha “${trilha}”.`;
    }

    return 'Atividade';
  }
})();
