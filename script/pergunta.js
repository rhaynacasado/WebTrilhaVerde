
(function bootstrapPerguntas(){
  const onPage = document.getElementById('pagePerguntas') !== null;
  if (!onPage) return;

  const host = document.getElementById('modals') || document.body;

  const needsEdit = !document.getElementById('perguntaModal');
  const needsAdd  = !document.getElementById('perguntaAddModal');

  const tasks = [];
  if (needsEdit){
    tasks.push(fetch('../partials/modal-pergunta.html')
      .then(r => r.text())
      .then(txt => {
        const doc = new DOMParser().parseFromString(txt, 'text/html');
        Array.from(doc.body.children).forEach(n => host.appendChild(n));
      }).catch(()=>{}));
  }
  if (needsAdd){
    tasks.push(fetch('../partials/modal-pergunta-add.html')
      .then(r => r.text())
      .then(txt => {
        const doc = new DOMParser().parseFromString(txt, 'text/html');
        Array.from(doc.body.children).forEach(n => host.appendChild(n));
      }).catch(()=>{}));
  }

  Promise.all(tasks).then(initPerguntas).catch(initPerguntas);
})();

function initPerguntas(){
  const container = document.getElementById('perguntasList');
  if (!container) return;

  const arvores = [
    { id: 1, codigo: 'IPE-AM', nome: 'Ipê Amarelo' },
    { id: 2, codigo: 'ARA-ANG', nome: 'Araucária' },
    { id: 3, codigo: 'PBR-ECH', nome: 'Pau-Brasil' },
  ];

  let perguntas = [
    {
      id: 101, arvoreId: 1,
      textoInfo: 'O ipê-amarelo floresce no inverno.',
      audioInfo: '', enunciado: 'Em que estação o ipê-amarelo costuma florescer?',
      itens: { A:'Verão', B:'Outono', C:'Inverno', D:'Primavera', E:'Todas' },
      correta: 'C', textoDica: 'Pense nos meses mais frios.', audioDica: ''
    },
    {
      id: 102, arvoreId: 1,
      textoInfo: '', audioInfo: '',
      enunciado: 'Qual é o nome científico do ipê-amarelo?',
      itens: { A:'Araucaria angustifolia', B:'Handroanthus albus', C:'Paubrasilia echinata', D:'Theobroma cacao', E:'Ficus benjamina' },
      correta: 'B', textoDica: 'Começa com H.', audioDica: ''
    },
    {
      id: 201, arvoreId: 2,
      textoInfo: 'A araucária é símbolo do Paraná.',
      audioInfo: '', enunciado: 'A araucária é símbolo de qual estado brasileiro?',
      itens: { A:'Paraná', B:'Bahia', C:'Amazonas', D:'Rio Grande do Sul', E:'São Paulo' },
      correta: 'A', textoDica: '', audioDica: ''
    },
    {
      id: 301, arvoreId: 3,
      textoInfo: '', audioInfo: '',
      enunciado: 'O pau-brasil foi muito explorado pela cor de sua madeira. Qual?',
      itens: { A:'Anil', B:'Escarlate', C:'Amarelo', D:'Verde', E:'Índigo' },
      correta: 'B', textoDica: 'Lembra o nome do país.', audioDica: ''
    }
  ];

  let nextPerguntaId = (perguntas.length ? Math.max(...perguntas.map(p => p.id)) : 0) + 1;

  const arvoreById = new Map(arvores.map(a => [a.id, a]));

  function makeBrushSvg(){
    const svg  = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p1.setAttribute('d','M14.7 5.3l4 4L9 19l-4.5 .5L5 15l9.7 -9.7z');
    p1.setAttribute('stroke','#1f2937'); p1.setAttribute('stroke-width','1.6');
    p1.setAttribute('stroke-linecap','round'); p1.setAttribute('stroke-linejoin','round'); p1.setAttribute('fill','none');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p2.setAttribute('d','M13.3 6.7l4 4'); p2.setAttribute('stroke','#1f2937'); p2.setAttribute('stroke-width','1.6'); p2.setAttribute('stroke-linecap','round');
    svg.appendChild(p1); svg.appendChild(p2); return svg;
  }

  function makePlusSvg(){
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
    const v = document.createElementNS('http://www.w3.org/2000/svg','path');
    v.setAttribute('d','M12 5v14M5 12h14');
    v.setAttribute('stroke','#fff'); v.setAttribute('stroke-width','2.2'); v.setAttribute('stroke-linecap','round');
    svg.appendChild(v);
    return svg;
  }

  function render(){
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

  function ensureConfirmModal(){
    if (confirmModalEl()) return;
    const host = document.getElementById('modals') || document.body;

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
    host.appendChild(modal);
  }

  function openConfirm(msg){
    ensureConfirmModal();
    const c = confirmModalEl(); if (!c) return;
    const t = document.getElementById('confirmPerguntaText');
    if (t) t.textContent = msg || 'Tem certeza que deseja excluir esta pergunta?';
    fixButtonTypes();
    c.classList.add('open'); c.setAttribute('aria-hidden','false');
    wireConfirmButtons(); // conecta handlers da confirmação
  }
  const closeConfirm = () => {
    const c = confirmModalEl(); if (!c) return;
    c.classList.remove('open'); c.setAttribute('aria-hidden','true');
  };

  function fixButtonTypes(){
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
    const q  = perguntas.find(x => x.id === id);
    if (!q) return;

    document.getElementById('perguntaHiddenId').value = q.id;
    document.getElementById('perguntaId').value       = String(q.id);
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

  document.addEventListener('submit', e => {
    if (e.target && e.target.id === 'perguntaForm') {
      e.preventDefault();

      const form = e.target;
      if (!form.reportValidity()) return;

      const id  = Number(document.getElementById('perguntaHiddenId').value);
      const idx = perguntas.findIndex(x => x.id === id);
      if (idx === -1) return;

      perguntas[idx] = {
        ...perguntas[idx],
        enunciado : document.getElementById('perguntaEnunciado').value.trim(),
        textoInfo : document.getElementById('perguntaTextoInfo').value.trim(),
        audioInfo : document.getElementById('perguntaAudioInfo').value.trim(),
        audioDica : document.getElementById('perguntaAudioDica').value.trim(),
        itens     : {
          A: document.getElementById('perguntaItemA').value.trim(),
          B: document.getElementById('perguntaItemB').value.trim(),
          C: document.getElementById('perguntaItemC').value.trim(),
          D: document.getElementById('perguntaItemD').value.trim(),
          E: document.getElementById('perguntaItemE').value.trim(),
        },
        correta   : document.getElementById('perguntaResposta').value,
        textoDica : document.getElementById('perguntaTextoDica').value.trim(),
      };

      render();
      closeModal();
      showFab();
    }
  });

  let pendingDeleteId = null;

  function wireEditModalButtons(){
    const m = modalEl(); if (!m) return;

    const delBtn =
      m.querySelector('#btnExcluirPergunta') ||
      m.querySelector('[data-action="delete"]') ||
      m.querySelector('.btn.danger');

    if (delBtn) {
      delBtn.type = 'button';
      delBtn.onclick = () => {
        const id = Number(document.getElementById('perguntaHiddenId').value);
        pendingDeleteId = id;

        const enunc = (document.getElementById('perguntaEnunciado')?.value || '').trim();
        const msg = enunc
          ? `Tem certeza que deseja excluir a pergunta #${id}: “${enunc}”?`
          : `Tem certeza que deseja excluir a pergunta #${id}?`;
        openConfirm(msg);
      };
    }
  }

  function wireConfirmButtons(){
    const c = confirmModalEl(); if (!c) return;

    const ok = c.querySelector('#btnConfirmExcluir') || c.querySelector('.btn.danger');
    const cancel = c.querySelector('#btnCancelExcluir') || c.querySelector('.btn');

    if (ok){
      ok.type = 'button';
      ok.onclick = () => {
        if (pendingDeleteId != null) {
          perguntas = perguntas.filter(q => q.id !== pendingDeleteId);
          pendingDeleteId = null;
          render();
          closeConfirm();
          closeModal();
          showFab();
        }
      };
    }
    if (cancel){
      cancel.type = 'button';
      cancel.onclick = () => { pendingDeleteId = null; closeConfirm(); };
    }
  }

  const fab = document.createElement('button');
  fab.className = 'fab-add';
  fab.title = 'Adicionar pergunta';
  fab.appendChild(makePlusSvg());
  document.body.appendChild(fab);

  fab.addEventListener('click', () => {
    const sel = document.getElementById('addArvore');
    if (sel){
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      arvores.forEach(a => {
        const opt = document.createElement('option');
        opt.value = String(a.id);
        opt.textContent = a.nome;
        sel.appendChild(opt);
      });
    }
    const mapIds = [
      'addEnunciado','addTextoInfo','addAudioInfo','addAudioDica',
      'addItemA','addItemB','addItemC','addItemD','addItemE','addTextoDica'
    ];
    mapIds.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const resp = document.getElementById('addResposta'); if (resp) resp.value = 'A';

    openAddModal();
  });

  document.addEventListener('submit', e => {
    if (e.target && e.target.id === 'perguntaAddForm') {
      e.preventDefault();

      const form = e.target;
      if (!form.reportValidity()) return;

      const arvoreId   = Number(document.getElementById('addArvore').value);
      const enunciado  = document.getElementById('addEnunciado').value.trim();
      const textoInfo  = document.getElementById('addTextoInfo').value.trim();
      const audioInfo  = document.getElementById('addAudioInfo').value.trim();
      const audioDica  = document.getElementById('addAudioDica').value.trim();
      const itemA      = document.getElementById('addItemA').value.trim();
      const itemB      = document.getElementById('addItemB').value.trim();
      const itemC      = document.getElementById('addItemC').value.trim();
      const itemD      = document.getElementById('addItemD').value.trim();
      const itemE      = document.getElementById('addItemE').value.trim();
      const correta    = document.getElementById('addResposta').value;
      const textoDica  = document.getElementById('addTextoDica').value.trim();

      const novo = {
        id: nextPerguntaId++,
        arvoreId,
        enunciado,
        textoInfo,
        audioInfo,
        audioDica,
        itens: { A:itemA, B:itemB, C:itemC, D:itemD, E:itemE },
        correta,
        textoDica
      };

      perguntas.push(novo);
      render();
      closeAddModal();
    }
  });

  function getFab(){ return document.querySelector('.fab-add'); }
  function hideFab(){ const f = getFab(); if (f) f.classList.add('is-hidden'); }
  function showFab(){ const f = getFab(); if (f) f.classList.remove('is-hidden'); }


  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('#pagePerguntas .edit-pill');
    if (editBtn) hideFab();
  }, true); 

  render();
}
