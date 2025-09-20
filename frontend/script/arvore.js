// frontend/script/arvore.js
(function initArvores(){
  const API_BASE = 'http://localhost:3001';   // ajuste se mudar a porta/host
  const listRoot = document.getElementById('arvoresList');
  if (!listRoot) return;

  // estado em memória (carregado do backend)
  let arvores = [];

  // util
  function getParam(name){
    const p = new URLSearchParams(location.search);
    return p.get(name);
  }
  function composedId(a){ // id único para a UI
    return `${a.trilha_nome}:${a.codigo}`;
  }

  // ======== modal (sua lógica original, com pequenos ajustes) =========
  function makeBrushSvg(stroke = '#1f2937'){
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('fill','none'); svg.setAttribute('aria-hidden','true');
    const p1 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p1.setAttribute('d','M14.7 5.3l4 4L9 19l-4.5.5L5 15l9.7-9.7z');
    p1.setAttribute('stroke', stroke); p1.setAttribute('stroke-width','1.6');
    p1.setAttribute('stroke-linecap','round'); p1.setAttribute('stroke-linejoin','round'); p1.setAttribute('fill','none');
    const p2 = document.createElementNS('http://www.w3.org/2000/svg','path');
    p2.setAttribute('d','M13.3 6.7l4 4'); p2.setAttribute('stroke', stroke); p2.setAttribute('stroke-width','1.6'); p2.setAttribute('stroke-linecap','round');
    svg.appendChild(p1); svg.appendChild(p2);
    return svg;
  }
  function getHost(){
    let host = document.getElementById('modals');
    if (!host){ host = document.createElement('div'); host.id = 'modals'; document.body.appendChild(host); }
    return host;
  }
  async function tryLoad(url){
    try{
      const res = await fetch(url, { cache:'no-store' });
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const toAppend = Array.from(doc.body.children);
      if (toAppend.length){
        const host = getHost();
        toAppend.forEach(n => host.appendChild(n));
      }
      return !!document.getElementById('arvoreModal');
    }catch(_){ return false; }
  }
  async function ensureModal(){
    if (document.getElementById('arvoreModal')) return;
    const candidates = [
      '../partials/modal-arvore.html',
      './partials/modal-arvore.html',
      '/partials/modal-arvore.html'
    ];
    for (const url of candidates){
      const ok = await tryLoad(url);
      if (ok) return;
    }
    // fallback se o partial não existir
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

    const gridLinks = document.createElement('div'); gridLinks.className='form__grid';
    gridLinks.appendChild(row('Foto (URL)', input('arvoreFoto','url',false,{placeholder:'https://...'})));
    gridLinks.appendChild(row('Ícone (não usado)', input('arvoreIcon','url',false,{placeholder:'—'}))); // não existe mais no banco

    const foot = document.createElement('footer'); foot.className='modal__foot';
    const btnToggle = document.createElement('button'); btnToggle.id='btnToggleStatus'; btnToggle.type='button'; btnToggle.className='btn danger'; btnToggle.textContent='Desativar';
    const btnSalvar = document.createElement('button'); btnSalvar.type='submit'; btnSalvar.className='btn primary'; btnSalvar.textContent='Alterar';
    foot.appendChild(btnToggle); foot.appendChild(btnSalvar);

    form.appendChild(gridIds); form.appendChild(rowNome); form.appendChild(rowEsp); form.appendChild(gridLinks); form.appendChild(foot);
    dialog.appendChild(head); dialog.appendChild(form);
    modal.appendChild(backdrop); modal.appendChild(dialog);
    host.appendChild(modal);

    function row(label, inputEl){
      const r = document.createElement('div'); r.className='form__row';
      const l = document.createElement('label'); l.textContent = label;
      r.appendChild(l); r.appendChild(inputEl); return r;
    }
    function input(id, type, ro=false, opts={}){
      const el = document.createElement('input'); el.id=id; el.type=type;
      if (ro){ el.readOnly=true; el.classList.add('input-readonly'); }
      if (opts.placeholder) el.placeholder=opts.placeholder;
      if (opts.required) el.required=true;
      return el;
    }
  }
  const modalEl   = () => document.getElementById('arvoreModal');
  const openModal = () => { const m = modalEl(); if (m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); } };
  const closeModal= () => { const m = modalEl(); if (m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); } };
  function setVal(id, v){ const el = document.getElementById(id); if (el) el.value = (v ?? ''); }
  function setToggle(isActive){
    const btn = document.getElementById('btnToggleStatus'); if (!btn) return;
    btn.classList.remove('danger','success');
    if (isActive){ btn.textContent='Desativar'; btn.classList.add('danger'); btn.dataset.action='deactivate'; }
    else { btn.textContent='Ativar'; btn.classList.add('success'); btn.dataset.action='activate'; }
  }

  // =============== RENDER ===============
  function render(){
    while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
    arvores.forEach(a => {
      const item = document.createElement('div'); item.className = 'item' + (a.ativa ? '' : ' disabled');

      const body = document.createElement('div'); body.className='item-body';
      const title = document.createElement('strong'); title.className='item-title'; title.textContent=a.nome;

      const sub = document.createElement('div'); sub.className='subline';
      const t = document.createElement('span'); t.className='meta'; t.textContent = `Trilha ${a.trilha_nome}`;
      const sep1 = document.createElement('span'); sep1.className='sep'; sep1.textContent='•';
      const q = document.createElement('span'); q.className='meta'; q.textContent = `${a.quantidade_perguntas ?? 0} perguntas`;
      const sep2 = document.createElement('span'); sep2.className='sep'; sep2.textContent='•';
      const st = document.createElement('span'); st.className='status ' + (a.ativa?'active':'inactive'); st.textContent = a.ativa?'Ativa':'Desativada';
      sub.appendChild(t); sub.appendChild(sep1); sub.appendChild(q); sub.appendChild(sep2); sub.appendChild(st);

      body.appendChild(title); body.appendChild(sub);

      const btn = document.createElement('button');
      btn.type='button'; btn.className='edit-pill'; btn.title='Editar';
      btn.dataset.id = composedId(a); // <— id composto
      btn.appendChild(makeBrushSvg());

      item.appendChild(body); item.appendChild(btn);
      listRoot.appendChild(item);
    });
  }

  // =============== Eventos ===============
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.edit-pill');
    if (btn && btn.closest('#arvoresList')){
      const id = String(btn.dataset.id);
      const a  = arvores.find(x => composedId(x) === id);
      if (!a) return;

      await ensureModal();
      if (!document.getElementById('arvoreModal')) return;

      setVal('arvoreTrilha', a.trilha_nome);
      setVal('arvoreCodigo', a.codigo);
      setVal('arvoreNome', a.nome);
      setVal('arvoreEspecie', a.especie || '');
      setVal('arvoreFoto', a.foto_url || '');
      setVal('arvoreIcon', ''); // não existe mais
      setToggle(!!a.ativa);

      openModal();
      return;
    }

    if (e.target && (e.target.matches('#arvoreModal [data-close]') || e.target.matches('#arvoreModal .modal__backdrop'))){
      closeModal(); return;
    }

    // ---- Toggle de ATIVA (agora persistente no banco) ----
    if (e.target && e.target.id === 'btnToggleStatus'){
      const trilha = (document.getElementById('arvoreTrilha') || {}).value || '';
      const codigo = Number((document.getElementById('arvoreCodigo') || {}).value || 0);
      const idx = arvores.findIndex(x => x.trilha_nome === trilha && Number(x.codigo) === codigo);
      if (idx === -1) return;

      const novaAtiva = !arvores[idx].ativa;

      try {
        const resp = await fetch(`${API_BASE}/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(codigo)}/ativa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativa: novaAtiva })
        });
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(`Falha ao salvar: ${resp.status} ${t}`);
        }
        const data = await resp.json(); // { ativa, trilha_nome, codigo }
        arvores[idx].ativa = !!data.ativa; // sincroniza com o servidor
        render();
        closeModal();
      } catch (err) {
        console.error(err);
        alert('Erro ao alterar status no servidor.');
      }
    }
  });

  document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'arvoreForm'){
      e.preventDefault();

      const trilha  = (document.getElementById('arvoreTrilha') || {}).value || '';
      const codigo  = Number((document.getElementById('arvoreCodigo') || {}).value || 0);
      const idx = arvores.findIndex(x => x.trilha_nome === trilha && Number(x.codigo) === codigo);
      if (idx === -1) return;

      const nome    = (document.getElementById('arvoreNome')    || {}).value?.trim() ?? '';
      const especie = (document.getElementById('arvoreEspecie') || {}).value?.trim() ?? '';
      const foto    = (document.getElementById('arvoreFoto')    || {}).value?.trim() ?? '';

      // 1) feedback visual rápido
      arvores[idx] = { ...arvores[idx], nome, especie, foto_url: foto };
      render();

      // 2) salva no servidor
      try {
        const resp = await fetch(`${API_BASE}/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(codigo)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, especie, foto_url: foto })
        });
        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(`Falha ao salvar: ${resp.status} ${t}`);
        }
        const saved = await resp.json();
        arvores[idx] = { ...arvores[idx], ...saved };
        render();
        closeModal();
      } catch (err) {
        console.error(err);
        alert('Erro ao salvar no servidor. Recarregando lista.');
        loadArvores(); // ressincroniza
        closeModal();
      }
    }
  });

  // =============== Carregar do backend ===============
  async function loadArvores(){
    const trilhaParam = getParam('trilha'); // ex.: arvores.html?trilha=Árvores%20Úteis
    const qs = trilhaParam ? `?trilha=${encodeURIComponent(trilhaParam)}` : '';
    const url = `${API_BASE}/api/arvores${qs}`;
    try {
      const resp = await fetch(url, { credentials: 'omit' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      // normaliza tipos
      arvores = (Array.isArray(data) ? data : []).map(a => ({
        trilha_nome: a.trilha_nome,
        codigo: Number(a.codigo),
        nome: a.nome,
        especie: a.especie || '',
        foto_url: a.foto_url || '',
        quantidade_perguntas: Number(a.quantidade_perguntas ?? 0),
        ativa: !!a.ativa
      }));
      render();
    } catch (err) {
      console.error('Falha ao carregar árvores:', err);
      listRoot.innerHTML = '<p>Erro ao carregar árvores.</p>';
    }
  }

  // inicializa
  loadArvores();
})();
