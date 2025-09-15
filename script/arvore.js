(function initArvores(){
  const listRoot = document.getElementById('arvoresList');
  if (!listRoot) return;

  const arvores = [
    { id: 1, codigo: 'IPE-AM',  nome: 'Ipê Amarelo', trilha: 'Árvores Úteis', especie: 'Handroanthus albus',     foto: '', quantPerguntas: 4,  ativa: true },
    { id: 2, codigo: 'ARA-ANG', nome: 'Araucária', trilha: 'Árvores Úteis', especie: 'Araucaria angustifolia', foto: '', quantPerguntas: 6,  ativa: true },
    { id: 3, codigo: 'PBR-ECH', nome: 'Pau-Brasil', trilha: 'Árvores Úteis', especie: 'Paubrasilia echinata',   foto: '', quantPerguntas: 12, ativa: false },
  ];

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
      const text = await res.text(); // mesmo 404 retorna texto (pode ser vazio/HTML genérico)
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
    gridIds.appendChild(row('ID', input('arvoreId','text',true)));
    gridIds.appendChild(row('Código', input('arvoreCodigo','text',true)));

    const rowNome = row('Nome', input('arvoreNome','text',false,{required:true}));
    const rowEsp  = row('Espécie', input('arvoreEspecie','text',false,{required:true}));

    const gridLinks = document.createElement('div'); gridLinks.className='form__grid';
    gridLinks.appendChild(row('Foto (URL)', input('arvoreFoto','url',false,{placeholder:'https://...'})));
    gridLinks.appendChild(row('Ícone na trilha (URL)', input('arvoreIcon','url',false,{placeholder:'https://...'})));

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

  function render(){
    while (listRoot.firstChild) listRoot.removeChild(listRoot.firstChild);
    arvores.forEach(a => {
      const item = document.createElement('div'); item.className = 'item' + (a.ativa ? '' : ' disabled');

      const body = document.createElement('div'); body.className='item-body';
      const title = document.createElement('strong'); title.className='item-title'; title.textContent=a.nome;

      const sub = document.createElement('div'); sub.className='subline';
      const t = document.createElement('span'); t.className='meta'; t.textContent = `Trilha ${a.trilha}`;
      const sep1 = document.createElement('span'); sep1.className='sep'; sep1.textContent='•';
      const q = document.createElement('span'); q.className='meta'; q.textContent = `${a.quantPerguntas} perguntas`;
      const sep2 = document.createElement('span'); sep2.className='sep'; sep2.textContent='•';
      const st = document.createElement('span'); st.className='status ' + (a.ativa?'active':'inactive'); st.textContent = a.ativa?'Ativa':'Desativada';
      sub.appendChild(t); sub.appendChild(sep1); sub.appendChild(q); sub.appendChild(sep2); sub.appendChild(st);

      body.appendChild(title); body.appendChild(sub);

      const btn = document.createElement('button');
      btn.type='button'; btn.className='edit-pill'; btn.title='Editar'; btn.dataset.id=String(a.id);
      btn.appendChild(makeBrushSvg());

      item.appendChild(body); item.appendChild(btn);
      listRoot.appendChild(item);
    });
  }

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.edit-pill');
    if (btn && btn.closest('#arvoresList')){
      const id = Number(btn.dataset.id);
      const a  = arvores.find(x => x.id === id);
      if (!a) return;

      await ensureModal();  
      if (!document.getElementById('arvoreModal')) return; 

      setVal('arvoreId', a.id);
      setVal('arvoreCodigo', a.codigo);
      setVal('arvoreNome', a.nome);
      setVal('arvoreEspecie', a.especie);
      setVal('arvoreFoto', a.foto);
      setVal('arvoreIcon', a.icon);
      setToggle(a.ativa);

      openModal();
      return;
    }

    if (e.target && (e.target.matches('#arvoreModal [data-close]') || e.target.matches('#arvoreModal .modal__backdrop'))){
      closeModal(); return;
    }

    if (e.target && e.target.id === 'btnToggleStatus'){
      const id  = Number((document.getElementById('arvoreId') || {}).value || 0);
      const idx = arvores.findIndex(x => x.id === id); if (idx === -1) return;
      arvores[idx].ativa = !arvores[idx].ativa;
      render(); closeModal(); return;
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'arvoreForm'){
      e.preventDefault();
      const id  = Number((document.getElementById('arvoreId') || {}).value || 0);
      const idx = arvores.findIndex(x => x.id === id); if (idx === -1) return;
      const nome    = (document.getElementById('arvoreNome')    || {}).value?.trim() ?? '';
      const especie = (document.getElementById('arvoreEspecie') || {}).value?.trim() ?? '';
      const foto    = (document.getElementById('arvoreFoto')    || {}).value?.trim() ?? '';
      const icon    = (document.getElementById('arvoreIcon')    || {}).value?.trim() ?? '';
      arvores[idx] = { ...arvores[idx], nome, especie, foto, icon };
      render(); closeModal();
    }
  });

  render();
})();
