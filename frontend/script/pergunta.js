// frontend/script/perguntas.js (versão completa e corrigida)

(function bootstrapPerguntas() {
  const onPage = document.getElementById('pagePerguntas') !== null;
  if (!onPage) return;

  const API_BASE  = window.__API_BASE__ || 'http://127.0.0.1:3001';
  const TOKEN_KEY = 'token';

  // ---- helper fetch com Authorization ----
  async function authFetch(path, opts = {}) {
    const token   = localStorage.getItem(TOKEN_KEY);
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, { ...opts, headers });
  }

  const host = document.getElementById('modals') || document.body;

  // carrega os modais se não estiverem no DOM
  const needsEdit = !document.getElementById('perguntaModal');
  const needsAdd  = !document.getElementById('perguntaAddModal');
  const tasks = [];
  if (needsEdit) {
    tasks.push(
      fetch('../partials/modal-pergunta.html')
        .then(r => r.text())
        .then(txt => {
          const doc = new DOMParser().parseFromString(txt, 'text/html');
          Array.from(doc.body.children).forEach(n => host.appendChild(n));
        })
        .catch(() => {})
    );
  }
  if (needsAdd) {
    tasks.push(
      fetch('../partials/modal-pergunta-add.html')
        .then(r => r.text())
        .then(txt => {
          const doc = new DOMParser().parseFromString(txt, 'text/html');
          Array.from(doc.body.children).forEach(n => host.appendChild(n));
        })
        .catch(() => {})
    );
  }
  Promise.all(tasks).then(initPerguntas).catch(initPerguntas);

  // ====== estado ======
  let arvores = [];                 // [{ id(ui), trilha_nome, codigo, nome }]
  let perguntas = [];               // [{ id, arvoreId, ...campos UI }]
  let arvoreById = new Map();       // id(ui) -> { trilha_nome, codigo, nome }
  let nextPerguntaId = 1;

  async function loadArvores() {
    const resp = await fetch(`${API_BASE}/api/arvores`);
    if (!resp.ok) throw new Error('Falha ao carregar árvores');
    const data = await resp.json();

    arvores = data.map((a, idx) => ({
      id: idx + 1,
      trilha_nome: a.trilha_nome,
      codigo: Number(a.codigo),
      nome: a.nome
    }));
    arvoreById = new Map(arvores.map(a => [a.id, a]));
  }

  async function loadPerguntas() {
    const resp = await fetch(`${API_BASE}/api/perguntas`);
    if (!resp.ok) throw new Error('Falha ao carregar perguntas');
    const rows = await resp.json();

    perguntas = rows.map(r => {
      const a = arvores.find(x => x.trilha_nome === r.trilha_nome && x.codigo === Number(r.arvore_codigo));
      const arvoreId = a ? a.id : null;
      return {
        id: Number(r.id),
        arvoreId,
        enunciado: r.enunciado || '',
        textoInfo: r.texto || '',
        audioInfo: r.audio_url || '',
        audioDica: r.audio_dica_url || '',
        itens: {
          A: r.item_a || '', B: r.item_b || '', C: r.item_c || '',
          D: r.item_d || '', E: r.item_e || ''
        },
        correta: r.resposta_correta || 'A',
        textoDica: r.dica || ''
      };
    });

    nextPerguntaId = (perguntas.length ? Math.max(...perguntas.map(p => p.id)) : 0) + 1;
  }

  // ====== UI ======
  function initPerguntas() {
    const container = document.getElementById('perguntasList');
    if (!container) return;

    function makeBrushSvg() {
      const svg  = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.setAttribute('fill','none');
      svg.setAttribute('aria-hidden','true');
      const p1 = document.createElementNS('http://www.w3.org/2000/svg','path');
      p1.setAttribute('d','M14.7 5.3l4 4L9 19l-4.5 .5L5 15l9.7 -9.7z');
      p1.setAttribute('stroke','#1f2937'); p1.setAttribute('stroke-width','1.6');
      p1.setAttribute('stroke-linecap','round'); p1.setAttribute('stroke-linejoin','round');
      p1.setAttribute('fill','none');
      const p2 = document.createElementNS('http://www.w3.org/2000/svg','path');
      p2.setAttribute('d','M13.3 6.7l4 4');
      p2.setAttribute('stroke','#1f2937'); p2.setAttribute('stroke-width','1.6');
      p2.setAttribute('stroke-linecap','round');
      svg.appendChild(p1); svg.appendChild(p2);
      return svg;
    }

    function makePlusSvg() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 24 24');
      svg.setAttribute('fill','none');
      svg.setAttribute('aria-hidden','true');
      const v = document.createElementNS('http://www.w3.org/2000/svg','path');
      v.setAttribute('d','M12 5v14M5 12h14');
      v.setAttribute('stroke','#fff'); v.setAttribute('stroke-width','2.2');
      v.setAttribute('stroke-linecap','round');
      svg.appendChild(v);
      return svg;
    }

    function render() {
      while (container.firstChild) container.removeChild(container.firstChild);

      const byTree = new Map();
      perguntas.forEach(q => {
        if (!byTree.has(q.arvoreId)) byTree.set(q.arvoreId, []);
        byTree.get(q.arvoreId).push(q);
      });

      arvores.forEach(arv => {
        const groupQuestions = byTree.get(arv.id) || [];

        const h = document.createElement('h3');
        h.className = 'group-title';
        h.textContent = arv.nome;
        container.appendChild(h);

        const group = document.createElement('div');
        group.className = 'group';
        const list = document.createElement('div');
        list.className = 'list';
        group.appendChild(list);

        groupQuestions.forEach(q => {
          const item  = document.createElement('div');
          item.className = 'item';

          const body  = document.createElement('div');
          body.className = 'item-body';

          const title = document.createElement('strong');
          title.className = 'item-title';
          title.textContent = q.enunciado;

          const sub   = document.createElement('div');
          sub.className = 'subline';

          const sId   = document.createElement('span');
          sId.className = 'meta';
          sId.textContent = `ID ${q.id}`;

          const sep   = document.createElement('span');
          sep.className = 'sep';
          sep.textContent = '•';

          const sAns  = document.createElement('span');
          sAns.className = 'meta';
          sAns.textContent = `resp.: ${q.correta}`;

          sub.appendChild(sId); sub.appendChild(sep); sub.appendChild(sAns);

          body.appendChild(title);
          body.appendChild(sub);

          const edit  = document.createElement('button');
          edit.className = 'edit-pill';
          edit.title = 'Editar';
          edit.dataset.id = String(q.id);
          edit.dataset.arvoreId = String(q.arvoreId);
          edit.appendChild(makeBrushSvg());

          item.appendChild(body);
          item.appendChild(edit);
          list.appendChild(item);
        });

        container.appendChild(group);
      });
    }

    const modalEl        = () => document.getElementById('perguntaModal');
    const addModalEl     = () => document.getElementById('perguntaAddModal');
    const confirmModalEl = () => document.getElementById('confirmPerguntaModal');

    const openModal  = () => { const m = modalEl(); if (m){ fixButtonTypes(); m.classList.add('open');  m.setAttribute('aria-hidden','false'); wireEditModalButtons(); } };
    const closeModal = () => { const m = modalEl(); if (m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };

    const openAddModal = () => { const m = addModalEl(); if (m){ fixButtonTypes(); m.classList.add('open');  m.setAttribute('aria-hidden','false'); } };
    const closeAddModal= () => { const m = addModalEl(); if (m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };

    function ensureConfirmModal() {
      if (confirmModalEl()) return;
      const modal = document.createElement('div');
      modal.id = 'confirmPerguntaModal';
      modal.className = 'modal';
      modal.setAttribute('aria-hidden','true');

      const backdrop = document.createElement('div');
      backdrop.className = 'modal__backdrop';
      backdrop.setAttribute('data-close','');

      const dialog = document.createElement('div');
      dialog.className = 'modal__dialog';
      dialog.setAttribute('role','dialog');
      dialog.setAttribute('aria-modal','true');

      const head = document.createElement('header');
      head.className = 'modal__head';
      const h3 = document.createElement('h3');
      h3.textContent = 'Confirmar exclusão';
      const x = document.createElement('button');
      x.className = 'icon-btn'; x.type='button'; x.setAttribute('data-close','');
      x.appendChild(document.createTextNode('×'));
      head.appendChild(h3); head.appendChild(x);

      const form = document.createElement('div');
      form.className = 'form';
      const p = document.createElement('p');
      p.id = 'confirmPerguntaText';
      p.textContent = 'Tem certeza que deseja excluir esta pergunta?';
      form.appendChild(p);

      const foot = document.createElement('footer');
      foot.className = 'modal__foot';
      const cancel = document.createElement('button');
      cancel.id='btnCancelExcluir'; cancel.className='btn'; cancel.type='button'; cancel.textContent='Cancelar';
      const ok = document.createElement('button');
      ok.id='btnConfirmExcluir'; ok.className='btn danger'; ok.type='button'; ok.textContent='Excluir';
      foot.appendChild(cancel); foot.appendChild(ok);

      dialog.appendChild(head); dialog.appendChild(form); dialog.appendChild(foot);
      modal.appendChild(backdrop); modal.appendChild(dialog);
      (document.getElementById('modals') || document.body).appendChild(modal);
    }

    function openConfirm(msg) {
      ensureConfirmModal();
      const c = confirmModalEl(); if (!c) return;
      const t = document.getElementById('confirmPerguntaText');
      if (t) t.textContent = msg || 'Tem certeza que deseja excluir esta pergunta?';
      fixButtonTypes();
      c.classList.add('open'); c.setAttribute('aria-hidden','false');
      wireConfirmButtons();
    }
    const closeConfirm = () => {
      const c = confirmModalEl(); if (!c) return;
      c.classList.remove('open'); c.setAttribute('aria-hidden','true');
    };

    function fixButtonTypes() {
      ['btnExcluirPergunta','btnConfirmExcluir','btnCancelExcluir']
        .forEach(id => { const b = document.getElementById(id); if (b) b.type = 'button'; });
    }

    document.addEventListener('click', e => {
      if (e.target && (e.target.matches('#perguntaModal [data-close]') || e.target.matches('#perguntaModal .modal__backdrop'))) {
        closeModal(); showFab();
      }
      if (e.target && (e.target.matches('#perguntaAddModal [data-close]') || e.target.matches('#perguntaAddModal .modal__backdrop'))) {
        closeAddModal();
      }
      if (e.target && (e.target.matches('#confirmPerguntaModal [data-close]') || e.target.matches('#confirmPerguntaModal .modal__backdrop'))) {
        closeConfirm();
      }
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const editOpen = document.getElementById('perguntaModal')?.classList.contains('open');
        closeConfirm(); closeAddModal(); closeModal();
        if (editOpen) showFab();
      }
    });

    // abrir modal de edição
    container.addEventListener('click', e => {
      const btn = e.target.closest('.edit-pill');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      const arvoreId = Number(btn.dataset.arvoreId);
      const q  = perguntas.find(x => x.id === id && x.arvoreId === arvoreId);
      if (!q) return;

      document.getElementById('perguntaHiddenId').value = q.id;
      document.getElementById('perguntaArvoreId').value = String(q.arvoreId);
      document.getElementById('perguntaArvoreNome').value = arvoreById.get(q.arvoreId)?.nome || '';

      document.getElementById('perguntaEnunciado').value   = q.enunciado || '';
      document.getElementById('perguntaTextoInfo').value   = q.textoInfo || '';
      document.getElementById('perguntaAudioInfo').value   = q.audioInfo || '';
      document.getElementById('perguntaAudioDica').value   = q.audioDica || '';
      document.getElementById('perguntaItemA').value       = q.itens?.A || '';
      document.getElementById('perguntaItemB').value       = q.itens?.B || '';
      document.getElementById('perguntaItemC').value       = q.itens?.C || '';
      document.getElementById('perguntaItemD').value       = q.itens?.D || '';
      document.getElementById('perguntaItemE').value       = q.itens?.E || '';
      document.getElementById('perguntaResposta').value    = q.correta || 'A';
      document.getElementById('perguntaTextoDica').value   = q.textoDica || '';

      hideFab();
      openModal();
    });

    // salvar edição -> PUT (autenticado)
    document.addEventListener('submit', async e => {
      if (e.target && e.target.id === 'perguntaForm') {
        e.preventDefault();
        if (!e.target.reportValidity()) return;

        const id        = Number(document.getElementById('perguntaHiddenId').value);
        const arvoreId  = Number(document.getElementById('perguntaArvoreId').value);
        const aRef      = arvoreById.get(arvoreId);
        if (!aRef) return;

        const payload = {
          enunciado : document.getElementById('perguntaEnunciado').value.trim(),
          texto     : document.getElementById('perguntaTextoInfo').value.trim(),
          audio_url : document.getElementById('perguntaAudioInfo').value.trim(),
          audio_dica_url : document.getElementById('perguntaAudioDica').value.trim(),
          item_a    : document.getElementById('perguntaItemA').value.trim(),
          item_b    : document.getElementById('perguntaItemB').value.trim(),
          item_c    : document.getElementById('perguntaItemC').value.trim(),
          item_d    : document.getElementById('perguntaItemD').value.trim(),
          item_e    : document.getElementById('perguntaItemE').value.trim(),
          resposta_correta: document.getElementById('perguntaResposta').value,
          dica      : document.getElementById('perguntaTextoDica').value.trim(),
        };

        // atualização otimista na UI
        const idx = perguntas.findIndex(x => x.id === id && x.arvoreId === arvoreId);
        if (idx !== -1) {
          perguntas[idx] = {
            ...perguntas[idx],
            enunciado: payload.enunciado,
            textoInfo: payload.texto,
            audioInfo: payload.audio_url,
            audioDica: payload.audio_dica_url,
            itens: { A:payload.item_a, B:payload.item_b, C:payload.item_c, D:payload.item_d, E:payload.item_e },
            correta: payload.resposta_correta,
            textoDica: payload.dica
          };
          render();
        }

        try {
          const url  = `/api/perguntas/${encodeURIComponent(aRef.trilha_nome)}/${encodeURIComponent(String(aRef.codigo))}/${encodeURIComponent(String(id))}`;
          const resp = await authFetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error(`PUT falhou: ${resp.status}`);
          closeModal(); showFab();
        } catch (err) {
          console.error(err);
          alert('Erro ao salvar pergunta (verifique se está logado).');
        }
      }
    });

    // exclusão (autenticada)
    let pendingDelete = { id: null, arvoreId: null };

    function wireEditModalButtons() {
      const m = modalEl(); if (!m) return;
      const delBtn =
        m.querySelector('#btnExcluirPergunta') ||
        m.querySelector('[data-action="delete"]') ||
        m.querySelector('.btn.danger');

      if (delBtn) {
        delBtn.type = 'button';
        delBtn.onclick = () => {
          const id       = Number(document.getElementById('perguntaHiddenId').value);
          const arvoreId = Number(document.getElementById('perguntaArvoreId').value);
          pendingDelete = { id, arvoreId };

          const enunc = (document.getElementById('perguntaEnunciado')?.value || '').trim();
          const msg = enunc
            ? `Tem certeza que deseja excluir a pergunta #${id}: “${enunc}”?`
            : `Tem certeza que deseja excluir a pergunta #${id}?`;
          openConfirm(msg);
        };
      }
    }

    function wireConfirmButtons() {
      const c = confirmModalEl(); if (!c) return;

      const ok = c.querySelector('#btnConfirmExcluir') || c.querySelector('.btn.danger');
      const cancel = c.querySelector('#btnCancelExcluir') || c.querySelector('.btn');

      if (ok) {
        ok.type = 'button';
        ok.onclick = async () => {
          const { id, arvoreId } = pendingDelete || {};
          pendingDelete = { id: null, arvoreId: null };
          const aRef = arvoreById.get(arvoreId);
          if (!aRef) return;

          // remove otimista
          perguntas = perguntas.filter(q => !(q.id === id && q.arvoreId === arvoreId));
          render();

          try {
            const url  = `/api/perguntas/${encodeURIComponent(aRef.trilha_nome)}/${encodeURIComponent(String(aRef.codigo))}/${encodeURIComponent(String(id))}`;
            const resp = await authFetch(url, { method: 'DELETE' });
            if (!resp.ok && resp.status !== 204) throw new Error(`DELETE ${resp.status}`);
          } catch (err) {
            console.error(err);
            alert('Erro ao excluir pergunta (verifique se está logado).');
          } finally {
            closeConfirm(); closeModal(); showFab();
          }
        };
      }
      if (cancel) {
        cancel.type = 'button';
        cancel.onclick = () => { pendingDelete = { id:null, arvoreId:null }; closeConfirm(); };
      }
    }

    // FAB (adicionar)
    const fab = document.createElement('button');
    fab.className = 'fab-add';
    fab.title = 'Adicionar pergunta';
    fab.appendChild(makePlusSvg());
    document.body.appendChild(fab);

    fab.addEventListener('click', () => {
      const sel = document.getElementById('addArvore');
      if (sel) {
        while (sel.firstChild) sel.removeChild(sel.firstChild);
        arvores.forEach(a => {
          const opt = document.createElement('option');
          opt.value = String(a.id);
          opt.textContent = a.nome;
          sel.appendChild(opt);
        });
      }
      const fields = [
        'addEnunciado','addTextoInfo','addAudioInfo','addAudioDica',
        'addItemA','addItemB','addItemC','addItemD','addItemE','addTextoDica'
      ];
      fields.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      const resp = document.getElementById('addResposta'); if (resp) resp.value = 'A';
      openAddModal();
    });

    function getFab(){ return document.querySelector('.fab-add'); }
    function hideFab(){ const f = getFab(); if (f) f.classList.add('is-hidden'); }
    function showFab(){ const f = getFab(); if (f) f.classList.remove('is-hidden'); }

    document.addEventListener('click', (e) => {
      const editBtn = e.target.closest('#pagePerguntas .edit-pill');
      if (editBtn) hideFab();
    }, true);
    
    // ==============================================================================
    // == NOVO CÓDIGO ADICIONADO PARA O FORMULÁRIO DE 'ADICIONAR PERGUNTA'
    // ==============================================================================
    document.addEventListener('submit', async e => {
      // Certifique-se que o id do seu formulário no modal de adição é 'perguntaAddForm'
      if (e.target && e.target.id === 'perguntaAddForm') {
        e.preventDefault();
        if (!e.target.reportValidity()) return;

        // 1. Coleta os dados do formulário de adição
        const arvoreUIId = Number(document.getElementById('addArvore').value);
        const arvoreRef = arvoreById.get(arvoreUIId);

        if (!arvoreRef) {
          alert('Árvore selecionada é inválida!');
          return;
        }

        const payload = {
          trilha_nome: arvoreRef.trilha_nome,
          arvore_codigo: arvoreRef.codigo,
          enunciado: document.getElementById('addEnunciado').value.trim(),
          texto: document.getElementById('addTextoInfo').value.trim(),
          audio_url: document.getElementById('addAudioInfo').value.trim(),
          audio_dica_url: document.getElementById('addAudioDica').value.trim(),
          item_a: document.getElementById('addItemA').value.trim(),
          item_b: document.getElementById('addItemB').value.trim(),
          item_c: document.getElementById('addItemC').value.trim(),
          item_d: document.getElementById('addItemD').value.trim(),
          item_e: document.getElementById('addItemE').value.trim(),
          resposta_correta: document.getElementById('addResposta').value,
          dica: document.getElementById('addTextoDica').value.trim(),
        };

        // 2. Envia os dados para o backend (POST)
        try {
          const resp = await authFetch('/api/perguntas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!resp.ok) {
            const errData = await resp.json();
            throw new Error(errData.error || `POST falhou: ${resp.status}`);
          }

          const novaPergunta = await resp.json();

          // 3. Atualiza a lista na tela (UI) com a nova pergunta
          perguntas.push({
            id: Number(novaPergunta.id),
            arvoreId: arvoreUIId,
            enunciado: novaPergunta.enunciado || '',
            textoInfo: novaPergunta.texto || '',
            audioInfo: novaPergunta.audio_url || '',
            audioDica: novaPergunta.audio_dica_url || '',
            itens: {
              A: novaPergunta.item_a || '', B: novaPergunta.item_b || '', C: novaPergunta.item_c || '',
              D: novaPergunta.item_d || '', E: novaPergunta.item_e || ''
            },
            correta: novaPergunta.resposta_correta || 'A',
            textoDica: novaPergunta.dica || ''
          });
          
          render(); // Re-renderiza a lista de perguntas na tela
          closeAddModal(); // Fecha o modal de adição

        } catch (err) {
          console.error(err);
          alert(`Erro ao criar pergunta: ${err.message}`);
        }
      }
    });

    // bootstrap
    (async () => {
      try {
        await loadArvores();
        await loadPerguntas();
        render();
      } catch (e) {
        console.error(e);
        container.innerHTML = '<p>Erro ao carregar perguntas.</p>';
      }
    })();
  }
})();