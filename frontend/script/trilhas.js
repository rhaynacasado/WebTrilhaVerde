// frontend/script/trilhas.js
(function () {
  const API_BASE = 'http://localhost:3001'; // ajuste se necessário

  function byId(id) { return document.getElementById(id); }

  async function carregarTrilhas() {
    const box = byId('trilhasList');
    if (!box) {
      console.error('Elemento #trilhasList não encontrado no DOM');
      return;
    }
    box.innerHTML = '<p>Carregando trilhas...</p>';

    try {
      const url = `${API_BASE}/api/trilhas`;
      console.log('Buscando:', url);

      const resp = await fetch(url, { credentials: 'omit' });
      console.log('HTTP status:', resp.status);

      if (!resp.ok) {
        const txt = await resp.text();
        console.error('Falha no fetch:', resp.status, txt);
        box.innerHTML = `<p>Erro ao carregar trilhas (${resp.status}).</p>`;
        return;
      }

      const trilhas = await resp.json();
      console.log('Trilhas recebidas:', trilhas);

      box.innerHTML = '';
      if (!Array.isArray(trilhas) || trilhas.length === 0) {
        box.innerHTML = '<p>Nenhuma trilha encontrada.</p>';
        return;
      }

      trilhas.forEach(r => {
        const el = document.createElement('div');
        el.className = 'item';

        const strong = document.createElement('strong');
        strong.className = 'item-title';
        strong.textContent = r.nome;
        el.appendChild(strong);

        const span = document.createElement('span');
        span.className = 'meta';
        // estes campos vêm da rota que sugeri (/api/trilhas)
        const ativas = Number(r.arvores_ativas ?? 0);
        const perguntas = Number(r.perguntas ?? 0);
        span.textContent = `${ativas} árvores ativas`;
        el.appendChild(span);

        el.onclick = () => {
          window.location.href = `arvores.html?trilha=${encodeURIComponent(r.nome)}`;
        };

        box.appendChild(el);
      });
    } catch (err) {
      console.error('Exceção no carregarTrilhas:', err);
      byId('trilhasList').innerHTML = '<p>Erro inesperado ao carregar trilhas.</p>';
    }
  }

  // espera o DOM
  document.addEventListener('DOMContentLoaded', carregarTrilhas);
})();
