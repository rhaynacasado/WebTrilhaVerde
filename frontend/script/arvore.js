// frontend/script/arvore.js
(function initArvores() {
  const API_BASE  = window.__API_BASE__ || 'http://127.0.0.1:3001';
  const TOKEN_KEY = 'token';
  const listRoot  = document.getElementById('arvoresList');
  if (!listRoot) return;

  // fetch com Authorization automático
  async function authFetch(path, opts = {}) {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { ...(opts.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    return fetch(`${API_BASE}${path}`, { ...opts, headers });
  }

  // ===== estado =====
  let arvores = [];

  // utils
  const getParam = (n) => new URLSearchParams(location.search).get(n);
  const composedId = (a) => `${a.trilha_nome}:${a.codigo}`;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v ?? ''); };
  const modalEl   = () => document.getElementById('arvoreModal');
  const openModal = () => { const m = modalEl(); if (m){ m.classList.add('open');  m.setAttribute('aria-hidden','false'); } };
  const closeModal= () => { const m = modalEl(); if (m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };
  const parseNum = (v) => {
    if (v === '' || v == null) return null;
    const n = parseFloat(String(v).replace(',','.'));
    return Number.isFinite(n) ? n : null;
  };

  function makeBrushSvg(stroke = '#1f2937') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p1.setAttribute('d','M14.7 5.3l4 4L9 19l-4.5 .5L5 15l9.7 -9.7z');
    p1.setAttribute('stroke', stroke); p1.setAttribute('stroke-width','1.6');
    p1.setAttribute('stroke-linecap','round'); p1.setAttribute('stroke-linejoin','round'); p1.setAttribute('fill','none');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p2.setAttribute('d','M13.3 6.7l4 4'); p2.setAttribute('stroke', stroke); p2.setAttribute('stroke-width','1.6'); p2.setAttribute('stroke-linecap','round');
    svg.appendChild(p1); svg.appendChild(p2);
    return svg;
  }

  // ===== modal =====
  function getHost() {
    return document.getElementById('modals') || document.body;
  }
  async function tryLoad(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const toAppend = Array.from(doc.body.children);
      if (toAppend.length) toAppend.forEach(n => getHost().appendChild(n));
      return !!document.getElementById('arvoreModal');
    } catch { return false; }
  }
  async function ensureModal() {
    if (document.getElementById('arvoreModal')) return;

    // tenta carregar o partial
    const candidates = [
      '../partials/modal-arvore.html',
      './partials/modal-arvore.html',
      '/partials/modal-arvore.html'
    ];
    for (const url of candidates) {
      const ok = await tryLoad(url);
      if (ok) return;
    }

    // fallback construído via JS (já com Posição X/Y)
    const host   = getHost();
    const modal  = document.createElement('div');
    modal.id = 'arvoreModal'; modal.className = 'modal'; modal.setAttribute('aria-hidden','true');

    const backdrop = document.createElement('div');
    backdrop.className = 'modal__backdrop'; backdrop.setAttribute('data-close','');

    const dialog = document.createElement('div');
    dialog.className = 'modal__dialog'; dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');

    const head = document.createElement('header'); head.className = 'modal__head';
    const h3 = document.createElement('h3'); h3.textContent = 'Editar árvore';
    const close = document.createElement('button'); close.type='button'; close.className='icon-btn'; close.setAttribute('data-close',''); close.appendChild(document.createTextNode('×'));
    head.appendChild(h3); head.appendChild(close);

    const form = document.createElement('form'); form.id='arvoreForm'; form.className='form';

    const gridIds = document.createElement('div'); gridIds.className='form__grid';
    gridIds.appendChild(row('Trilha', input('arvoreTrilha','text',true)));
    gridIds.appendChild(row('Código', input('arvoreCodigo','text',true)));

    const rowNome = row('Nome', input('arvoreNome','text',false,{required:true}));
    const rowEsp  = row('Espécie', input('arvoreEspecie','text',false,{required:true}));

    const grid1 = document.createElement('div'); grid1.className='form__grid';
    grid1.appendChild(row('Foto (URL)', input('arvoreFoto','url',false,{placeholder:'https://...'})));
    grid1.appendChild(row('Posição X', input('arvorePosX','number',false,{step:'any', placeholder:'ex.: -42.123456'})));

    const grid2 = document.createElement('div'); grid2.className='form__grid';
    grid2.appendChild(row('Posição Y', input('arvorePosY','number',false,{step:'any', placeholder:'ex.: -22.654321'})));

    const foot = document.createElement('footer'); foot.className='modal__foot';
    const btnToggle = document.createElement('button'); btnToggle.id='btnToggleStatus'; btnToggle.type='button'; btnToggle.className='btn danger'; btnToggle.textContent='Desativar';
    const btnSalvar = document.createElement('button'); btnSalvar.type='submit'; btnSalvar.className='btn primary'; btnSalvar.textContent='Alterar';
    foot.appendChild(btnToggle); foot.appendChild(btnSalvar);

    form.appendChild(gridIds);
    form.appendChild(rowNome);
    form.appendChild(rowEsp);
    form.appendChild(grid1);
    form.appendChild(grid2);
    form.appendChild(foot);

    dialog.appendChild(head); dialog.appendChild(form);
    modal.appendChild(backdrop); modal.appendChild(dialog);
    host.appendChild(modal);

    function row(label, inputEl) {
      const r = document.createElement('div'); r.className='form__row';
      const l = document.createElement('label'); l.textContent = label;
      r.appendChild(l); r.appendChild(inputEl); return r;
    }
    function input(id, type, ro=false, opts={}) {
      const el = document.createElement('input'); el.id=id; el.type=type;
      if (ro){ el.readOnly=true; el.classList.add('input-readonly'); }
      if (opts.placeholder) el.placeholder=opts.placeholder;
      if (opts.required) el.required=true;
      if (opts.step) el.step=opts.step;
      return el;
    }
  }

  function setToggle(isActive){
    const btn = document.getElementById('btnToggleStatus'); if (!btn) return;
    btn.classList.remove('danger','success');
    if (isActive) { btn.textContent='Desativar'; btn.classList.add('danger');   btn.dataset.action='deactivate'; }
    else          { btn.textContent='Ativar';    btn.classList.add('success');  btn.dataset.action='activate'; }
  }

  // ===== render =====
  function render() {
    while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
    arvores.forEach(a => {
      const item  = document.createElement('div'); item.className = 'item' + (a.ativa ? '' : ' disabled');
      const body  = document.createElement('div'); body.className  = 'item-body';
      const title = document.createElement('strong'); title.className='item-title'; title.textContent=a.nome;

      const sub   = document.createElement('div'); sub.className='subline';
      const t  = document.createElement('span'); t.className='meta'; t.textContent = `Trilha ${a.trilha_nome}`;
      const s1 = document.createElement('span'); s1.className='sep';  s1.textContent='•';
      const q  = document.createElement('span'); q.className='meta'; q.textContent = `${a.quantidade_perguntas ?? 0} perguntas`;
      const s2 = document.createElement('span'); s2.className='sep';  s2.textContent='•';
      const st = document.createElement('span'); st.className='status '+(a.ativa?'active':'inactive'); st.textContent = a.ativa?'Ativa':'Desativada';
      sub.appendChild(t); sub.appendChild(s1); sub.appendChild(q); sub.appendChild(s2); sub.appendChild(st);

      body.appendChild(title); body.appendChild(sub);

      const btn = document.createElement('button');
      btn.type='button'; btn.className='edit-pill'; btn.title='Editar';
      btn.dataset.id = composedId(a);
      btn.appendChild(makeBrushSvg());

      item.appendChild(body); item.appendChild(btn);
      listRoot.appendChild(item);
    });
  }

  // ===== eventos =====
  document.addEventListener('click', async (e) => {
    // abrir modal
    const btn = e.target.closest('.edit-pill');
    if (btn && btn.closest('#arvoresList')) {
      const id = String(btn.dataset.id);
      const a  = arvores.find(x => composedId(x) === id);
      if (!a) return;

      await ensureModal();
      setVal('arvoreTrilha', a.trilha_nome);
      setVal('arvoreCodigo', a.codigo);
      setVal('arvoreNome', a.nome);
      setVal('arvoreEspecie', a.especie || '');
      setVal('arvoreFoto', a.foto_url || '');
      setVal('arvorePosX', a.pos_x ?? '');
      setVal('arvorePosY', a.pos_y ?? '');
      setToggle(!!a.ativa);
      openModal();
      return;
    }

    // fechar modal por backdrop / X
    if (e.target && (e.target.matches('#arvoreModal [data-close]') || e.target.matches('#arvoreModal .modal__backdrop'))) {
      closeModal(); return;
    }

    // toggle ativa
    if (e.target && e.target.id === 'btnToggleStatus') {
      const trilha = (document.getElementById('arvoreTrilha') || {}).value || '';
      const codigo = Number((document.getElementById('arvoreCodigo') || {}).value || 0);
      const idx = arvores.findIndex(x => x.trilha_nome === trilha && Number(x.codigo) === codigo);
      if (idx === -1) return;

      const novaAtiva = !arvores[idx].ativa;
      try {
        const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/ativa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativa: novaAtiva })
        });
        if (!resp.ok) throw new Error(`Falha ao salvar: ${resp.status}`);
        const data = await resp.json();
        arvores[idx].ativa = !!data.ativa;
        render(); closeModal();
      } catch (err) {
        console.error(err);
        alert('Erro ao alterar status no servidor.');
      }
    }
  });

  // submit (salvar edição)
  document.addEventListener('submit', async (e) => {
    if (!(e.target && e.target.id === 'arvoreForm')) return;
    e.preventDefault();

    const trilha  = (document.getElementById('arvoreTrilha') || {}).value || '';
    const codigo  = Number((document.getElementById('arvoreCodigo') || {}).value || 0);
    const idx = arvores.findIndex(x => x.trilha_nome === trilha && Number(x.codigo) === codigo);
    if (idx === -1) return;

    const nome    = (document.getElementById('arvoreNome') || {}).value?.trim() ?? '';
    const especie = (document.getElementById('arvoreEspecie') || {}).value?.trim() ?? '';
    const foto    = (document.getElementById('arvoreFoto') || {}).value?.trim() ?? '';
    const pos_x   = parseNum((document.getElementById('arvorePosX') || {}).value);
    const pos_y   = parseNum((document.getElementById('arvorePosY') || {}).value);

    // otimista
    arvores[idx] = { ...arvores[idx], nome, especie, foto_url: foto, pos_x, pos_y };
    render();

    try {
      const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, especie, foto_url: foto, pos_x, pos_y })
      });
      if (!resp.ok) throw new Error(`Falha ao salvar: ${resp.status}`);
      const saved = await resp.json();
      arvores[idx] = { ...arvores[idx], ...saved };
      render(); closeModal();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar no servidor. Recarregando lista.');
      loadArvores(); closeModal();
    }
  });

  // ===== carregar lista =====
  async function loadArvores() {
    const trilhaParam = getParam('trilha');
    const qs = trilhaParam ? `?trilha=${encodeURIComponent(trilhaParam)}` : '';
    try {
      const resp = await fetch(`${API_BASE}/api/arvores${qs}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      arvores = (Array.isArray(data) ? data : []).map(a => ({
        trilha_nome: a.trilha_nome,
        codigo: Number(a.codigo),
        nome: a.nome,
        especie: a.especie || '',
        foto_url: a.foto_url || '',
        quantidade_perguntas: Number(a.quantidade_perguntas ?? 0),
        ativa: !!a.ativa,
        // novos campos
        pos_x: a.pos_x == null ? null : Number(a.pos_x),
        pos_y: a.pos_y == null ? null : Number(a.pos_y),
      }));
      render();
    } catch (err) {
      console.error('Falha ao carregar árvores:', err);
      listRoot.innerHTML = '<p>Erro ao carregar árvores.</p>';
    }
  }

  loadArvores();
})();
