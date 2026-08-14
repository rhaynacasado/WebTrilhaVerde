// frontend/script/arvore.js
(function initArvores() {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
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
  let newImages = []; // imagens temporárias no modal de criação

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

  // ===== Google Maps helper =====
  const DEFAULT_CENTER = { lat: -22.7105478704092, lng: -47.632867682507566 };
  let googleMapsLoaded = false;
  function loadGoogleMaps() {
    if (googleMapsLoaded) return Promise.resolve();
    const key = window.__GOOGLE_MAPS_API_KEY__ || '';
    return new Promise((resolve, reject) => {
      if (!key) {
        console.warn('Google Maps API key not set (window.__GOOGLE_MAPS_API_KEY__)');
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-gmaps]');
      if (existing) {
        existing.addEventListener('load', () => { googleMapsLoaded = true; resolve(); });
        existing.addEventListener('error', () => resolve());
        return;
      }
      const s = document.createElement('script');
      s.setAttribute('data-gmaps','1');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;
      s.async = true; s.defer = true;
      s.onload = () => { googleMapsLoaded = true; resolve(); };
      s.onerror = () => { console.warn('Failed loading Google Maps script'); resolve(); };
      document.head.appendChild(s);
    });
  }

  function setupMap(containerId, latInputId, lngInputId) {
    let map, marker;

    const el = document.getElementById(containerId);
    if (!el) return null;

    function getLatLngFromInputs() {
      const lat = parseNum(document.getElementById(latInputId)?.value);
      const lng = parseNum(document.getElementById(lngInputId)?.value);
      if (lat == null || lng == null) return null;
      return { lat, lng };
    }

    function centerTo(latlng, zoom = 16) {
      if (!map) return;
      map.setCenter(latlng);
      if (zoom) map.setZoom(zoom);
    }

    function placeMarker(latlng) {
      if (!map) return;
      if (!marker) {
        marker = new google.maps.Marker({ position: latlng, map, draggable: true });
        marker.addListener('dragend', () => {
          const p = marker.getPosition();
          if (!p) return;
          const lat = Number(p.lat());
          const lng = Number(p.lng());
          const latEl = document.getElementById(latInputId);
          const lngEl = document.getElementById(lngInputId);
          if (latEl) latEl.value = lat;
          if (lngEl) lngEl.value = lng;
        });
      } else {
        marker.setPosition(latlng);
      }
    }

    async function init() {
      await loadGoogleMaps();
      if (typeof google === 'undefined' || !google.maps) {
        // Google Maps not available; nothing to do
        return { map: null, updateFromInputs: () => {} };
      }

      // initial center
      const ll = getLatLngFromInputs() || DEFAULT_CENTER;

      map = new google.maps.Map(el, { center: ll, zoom: 16 });
      placeMarker(ll);

      // click to move marker (ask confirmation first)
      map.addListener('click', (ev) => {
        const lat = ev.latLng.lat();
        const lng = ev.latLng.lng();
        const prettyLat = Number(lat).toFixed(6);
        const prettyLng = Number(lng).toFixed(6);
        const msg = `Confirmar alteração da posição para\nLatitude: ${prettyLat}\nLongitude: ${prettyLng}`;
        try {
          if (!window.confirm(msg)) return;
        } catch (e) {
          // if confirm is not available, proceed silently
        }

        const latlng = { lat, lng };
        placeMarker(latlng);
        const latEl = document.getElementById(latInputId);
        const lngEl = document.getElementById(lngInputId);
        if (latEl) latEl.value = lat;
        if (lngEl) lngEl.value = lng;
      });

      // monitor input changes to update map immediately
      const latEl = document.getElementById(latInputId);
      const lngEl = document.getElementById(lngInputId);
      let pending;
      function onInputChange() {
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => {
          const ll = getLatLngFromInputs();
          if (ll) {
            placeMarker(ll);
            centerTo(ll, 16);
          } else {
            // no coords -> center default
            centerTo(DEFAULT_CENTER, 12);
          }
        }, 200);
      }
      if (latEl) latEl.addEventListener('input', onInputChange);
      if (lngEl) lngEl.addEventListener('input', onInputChange);

      return { map, updateFromInputs: onInputChange };
    }

    return { init };
  }

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

  function makePlusSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('fill','none');
  svg.setAttribute('aria-hidden','true');

  const v = document.createElementNS('http://www.w3.org/2000/svg','path');
  v.setAttribute('d','M12 5v14M5 12h14');
  v.setAttribute('stroke','#fff');
  v.setAttribute('stroke-width','2.2');
  v.setAttribute('stroke-linecap','round');

  svg.appendChild(v);
  return svg;
}

  // ===== modal =====
  function getHost() {
    return document.getElementById('modals') || document.body;
  }
  async function tryLoad(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return false;
      const text = await res.text();
      const doc  = new DOMParser().parseFromString(text, 'text/html');
      const toAppend = Array.from(doc.body.children);
      if (toAppend.length) toAppend.forEach(n => getHost().appendChild(n));
      return !!(
        document.getElementById('arvoreModal') ||
        document.getElementById('arvoreAddModal')
      );
    } catch { return false; }
  }
  async function ensureModal() {
  const hasEdit = document.getElementById('arvoreModal');
  const hasAdd  = document.getElementById('arvoreAddModal');

  // se já tem os dois, não faz nada
  if (hasEdit && hasAdd) return;

  // tenta carregar os dois SEM parar no meio
  const candidates = [
    { url: '../partials/modal-arvore.html',     check: () => document.getElementById('arvoreModal') },
    { url: '../partials/modal-arvore-add.html', check: () => document.getElementById('arvoreAddModal') },
  ];

  for (const c of candidates) {
    if (!c.check()) {
      await tryLoad(c.url);
    }
  }

  // fallback só pro modal de edição (mantém seu comportamento original)
  if (!document.getElementById('arvoreModal')) {
    const host   = getHost();
    const modal  = document.createElement('div');
    modal.id = 'arvoreModal';
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
    h3.textContent = 'Editar árvore';

    const close = document.createElement('button');
    close.type='button';
    close.className='icon-btn';
    close.setAttribute('data-close','');
    close.appendChild(document.createTextNode('×'));

    head.appendChild(h3);
    head.appendChild(close);

    const form = document.createElement('form');
    form.id='arvoreForm';
    form.className='form';

    const gridIds = document.createElement('div');
    gridIds.className='form__grid';
    gridIds.appendChild(row('Trilha', input('arvoreTrilha','text',true)));
    gridIds.appendChild(row('Código', input('arvoreCodigo','text',true)));

    const rowNome = row('Nome', input('arvoreNome','text',false,{required:true}));
    const rowEsp  = row('Espécie', input('arvoreEspecie','text',false,{required:true}));

    const grid1 = document.createElement('div');
    grid1.className='form__grid';
    // gallery (dynamic fallback)
    const galleryRow = document.createElement('div');
    galleryRow.className='form__row';
    const galleryLabel = document.createElement('label'); galleryLabel.textContent = 'Galeria de fotos';
    const galleryWrap = document.createElement('div'); galleryWrap.id='arvoreImages';
    const galleryList = document.createElement('div'); galleryList.id='arvoreImagesList';
    const addWrap = document.createElement('div'); addWrap.style.cssText='display:flex;gap:8px;margin-top:8px;flex-wrap:wrap';
    const iUrl = input('addImageUrl','url',false,{placeholder:'URL da imagem'}); iUrl.style.flex='1';
    const iLeg = input('addImageLegenda','text',false,{placeholder:'Legenda'});
    const iFonte = input('addImageFonte','text',false,{placeholder:'Fonte'});
    const addBtn = document.createElement('button'); addBtn.id='btnAddImage'; addBtn.type='button'; addBtn.className='btn'; addBtn.textContent='Adicionar';
    addWrap.appendChild(iUrl); addWrap.appendChild(iLeg); addWrap.appendChild(iFonte); addWrap.appendChild(addBtn);
    galleryWrap.appendChild(galleryList); galleryWrap.appendChild(addWrap);
    galleryRow.appendChild(galleryLabel); galleryRow.appendChild(galleryWrap);
    grid1.appendChild(galleryRow);

    const foot = document.createElement('footer');
    foot.className='modal__foot';

    const btnToggle = document.createElement('button');
    btnToggle.id='btnToggleStatus';
    btnToggle.type='button';
    btnToggle.className='btn danger';
    btnToggle.textContent='Desativar';

    const btnSalvar = document.createElement('button');
    btnSalvar.type='submit';
    btnSalvar.className='btn primary';
    btnSalvar.textContent='Alterar';

    foot.appendChild(btnToggle);
    foot.appendChild(btnSalvar);

    form.appendChild(gridIds);
    form.appendChild(rowNome);
    form.appendChild(rowEsp);
    form.appendChild(grid1);
    form.appendChild(foot);

    dialog.appendChild(head);
    dialog.appendChild(form);
    modal.appendChild(backdrop);
    modal.appendChild(dialog);
    host.appendChild(modal);

    function row(label, inputEl) {
      const r = document.createElement('div');
      r.className='form__row';
      const l = document.createElement('label');
      l.textContent = label;
      r.appendChild(l);
      r.appendChild(inputEl);
      return r;
    }

    function input(id, type, ro=false, opts={}) {
      const el = document.createElement('input');
      el.id=id;
      el.type=type;
      if (ro){
        el.readOnly=true;
        el.classList.add('input-readonly');
      }
      if (opts.required) el.required=true;
      if (opts.placeholder) el.placeholder=opts.placeholder;
      if (opts.step) el.step=opts.step;
      return el;
    }
  }
}

  // ===== Gallery helpers =====
  async function fetchImages(trilha, codigo) {
    try {
      const resp = await fetch(`${API_BASE}/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/images`);
      if (!resp.ok) return [];
      return await resp.json();
    } catch (e) { return []; }
  }

  function makeImageRow(img, trilha, codigo, isNew=false) {
    const wrap = document.createElement('div');
    wrap.className = 'image-row';
    wrap.style.display = 'flex'; wrap.style.alignItems = 'center'; wrap.style.gap='8px'; wrap.style.marginBottom='6px';

    const a = document.createElement('a');
    a.href = img.url || '#';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = img.url || '';
    a.style.flex = '1';
    a.style.wordBreak = 'break-all';

    const meta = document.createElement('div');
    meta.style.fontSize='12px'; meta.style.color='#444';
    meta.innerHTML = `${img.legenda ? `<div>${escapeHtml(img.legenda)}</div>` : ''}${img.fonte ? `<div style="font-style:italic">${escapeHtml(img.fonte)}</div>` : ''}`;

    const btnEdit = document.createElement('button'); btnEdit.type='button'; btnEdit.className='btn'; btnEdit.textContent='Editar';
    const btnDel  = document.createElement('button'); btnDel.type='button';  btnDel.className='btn danger'; btnDel.textContent='Apagar';

    wrap.appendChild(a);
    wrap.appendChild(meta);
    wrap.appendChild(btnEdit);
    wrap.appendChild(btnDel);

    btnEdit.addEventListener('click', async () => {
      try {
        const newUrl = window.prompt('URL:', img.url || '') || '';
        if (!newUrl) return;
        const newLegenda = window.prompt('Legenda:', img.legenda || '') || '';
        const newFonte = window.prompt('Fonte:', img.fonte || '') || '';
        if (isNew) {
          // update local newImages entry
          img.url = newUrl; img.legenda = newLegenda; img.fonte = newFonte; renderAddImagesList();
          return;
        }
        const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/images/${encodeURIComponent(String(img.id))}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: newUrl, legenda: newLegenda, fonte: newFonte })
        });
        if (!resp.ok) throw new Error('Falha ao atualizar');
        renderEditImages(trilha, codigo);
      } catch (err) { console.error(err); alert(err.message || 'Erro'); }
    });

    btnDel.addEventListener('click', async () => {
      if (!confirm('Confirma exclusão desta imagem?')) return;
      try {
        if (isNew) {
          // remove local
          newImages = newImages.filter(n => n !== img);
          renderAddImagesList();
          return;
        }
        const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/images/${encodeURIComponent(String(img.id))}`, { method: 'DELETE' });
        if (!resp.ok && resp.status !== 204) throw new Error('Falha ao excluir');
        renderEditImages(trilha, codigo);
      } catch (err) { console.error(err); alert(err.message || 'Erro'); }
    });

    return wrap;
  }

  async function renderEditImages(trilha, codigo) {
    const list = document.getElementById('arvoreImagesList');
    if (!list) return;
    list.innerHTML = '';
    const imgs = await fetchImages(trilha, codigo);
    imgs.forEach(img => list.appendChild(makeImageRow(img, trilha, codigo, false)));
  }

  function renderAddImagesList() {
    const list = document.getElementById('addImagesList');
    if (!list) return;
    list.innerHTML = '';
    newImages.forEach(img => {
      list.appendChild(makeImageRow(img, null, null, true));
    });
  }

  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;" })[c]); }


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
      item.dataset.href = `perguntas.html?trilha=${encodeURIComponent(a.trilha_nome)}&codigo=${encodeURIComponent(String(a.codigo))}`;
      const body  = document.createElement('div'); body.className  = 'item-body';
      const title = document.createElement('strong'); title.className='item-title'; title.textContent=a.nome;

      const sub   = document.createElement('div'); sub.className='subline';
      const t  = document.createElement('span'); t.className='meta'; t.textContent = `Trilhas: ${a.trilhas.join(', ')}`;
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

  async function loadTrilhas() {
    const filtroSelect = document.getElementById('filtroTrilha');
    const addSelect    = document.getElementById('addTrilha');

    try {
      const resp = await fetch(`${API_BASE}/api/trilhas`);
      if (!resp.ok) throw new Error();

      const trilhas = await resp.json();

      // ordena alfabeticamente
      trilhas.sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR')
      );

      // ===== filtro =====
      if (filtroSelect) {
        filtroSelect.innerHTML = '<option value="">Todas</option>';

        trilhas.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.nome;
          opt.textContent = t.nome;
          filtroSelect.appendChild(opt);
        });

        // mantém filtro vindo da URL
        const trilhaParam = getParam('trilha');
        if (trilhaParam) {
          filtroSelect.value = trilhaParam;
        }
      }

      // ===== modal adicionar =====
      if (addSelect) {
        addSelect.innerHTML = '';

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecione uma trilha';
        placeholder.disabled = true;
        placeholder.selected = true;

        addSelect.appendChild(placeholder);

        trilhas.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.nome;
          opt.textContent = t.nome;
          addSelect.appendChild(opt);
        });
      }

    } catch (err) {
      console.error('Erro ao carregar trilhas', err);
    }
  }

  document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'filtroTrilha') {
      const trilha = e.target.value;

      // atualiza URL (opcional, mas bom)
      const url = new URL(window.location);
      if (trilha) url.searchParams.set('trilha', trilha);
      else url.searchParams.delete('trilha');

      window.history.replaceState({}, '', url);

      loadArvores(); // recarrega lista
    }
  });

  // ===== eventos =====
  document.addEventListener('click', async (e) => {
    // clicar no card -> abrir perguntas filtradas
    const card = e.target.closest('#arvoresList .item');

    if (
      card &&
      !e.target.closest('.edit-pill')
    ) {
      const href = card.dataset.href;
      if (href) {
        window.location.href = href;
        return;
      }
    }

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
      // render images gallery for this tree
      (async () => { await renderEditImages(a.trilha_nome, a.codigo); })();
      setVal('arvoreOrdem', a.ordem ?? '');
      setVal('arvoreFamilia', a.familia || '');
      setVal('arvoreOrigem', a.origem || '');
      setVal('arvoreTipoOrigem', a.tipo_origem || '');
      setVal('arvoreLatitude', a.latitude ?? '');
      setVal('arvoreLongitude', a.longitude ?? '');
      setToggle(!!a.ativa);
      openModal();

      // init map in edit modal
      (async () => {
        const mapObj = setupMap('arvoreMap','arvoreLatitude','arvoreLongitude');
        if (!mapObj) return;
        await mapObj.init();
      })();
      // wire add-image button in edit modal
      const btnAdd = document.getElementById('btnAddImage');
      if (btnAdd) {
        btnAdd.onclick = async () => {
          const url = (document.getElementById('addImageUrl') || {}).value?.trim() || '';
          const legenda = (document.getElementById('addImageLegenda') || {}).value?.trim() || '';
          const fonte = (document.getElementById('addImageFonte') || {}).value?.trim() || '';
          if (!url) { alert('Informe a URL da imagem'); return; }
          try {
            const resp = await authFetch(`/api/arvores/${encodeURIComponent(a.trilha_nome)}/${encodeURIComponent(String(a.codigo))}/images`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, legenda, fonte })
            });
            if (!resp.ok) throw new Error('Falha ao adicionar imagem');
            (document.getElementById('addImageUrl') || {}).value = '';
            (document.getElementById('addImageLegenda') || {}).value = '';
            (document.getElementById('addImageFonte') || {}).value = '';
            await renderEditImages(a.trilha_nome, a.codigo);
          } catch (err) { console.error(err); alert(err.message || 'Erro'); }
        };
      }
      return;
    }

    // fechar modal por backdrop / X
    if (e.target && (
      e.target.matches('[data-close]') ||
      e.target.classList.contains('modal__backdrop')
    )) {
      const modal = e.target.closest('.modal');
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden','true');
      }
      return;
    }

    // toggle ativa
    if (e.target && e.target.id === 'btnToggleStatus') {
      const trilha = (document.getElementById('arvoreTrilha') || {}).value || '';
      const codigo = Number((document.getElementById('arvoreCodigo') || {}).value || 0);
      const idx = arvores.findIndex(x => x.trilha_nome === trilha && Number(x.codigo) === codigo);
      if (idx === -1) return;

      const alvo = arvores[idx];
      const novaAtiva = !alvo.ativa;

      if (alvo.ativa && !novaAtiva) {
        const comOrdem = arvores.filter(x => x.trilha_nome === trilha && x.ordem != null);
        if (comOrdem.length) {
          const ordens = comOrdem.map(x => Number(x.ordem)).filter(n => Number.isFinite(n));
          if (ordens.length) {
            const min = Math.min(...ordens);
            const max = Math.max(...ordens);
            const atual = Number(alvo.ordem);
            if (Number.isFinite(atual) && (atual === min || atual === max)) {
              alert('Não é possível desativar a primeira ou a última árvore da trilha.');
              return;
            }
          }
        }
      }

      try {
        const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/ativa`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ativa: novaAtiva })
        });
        if (!resp.ok) {
          const payload = await resp.json().catch(() => ({}));
          const msg = payload && payload.error ? payload.error : `Falha ao salvar: ${resp.status}`;
          throw new Error(msg);
        }
        const data = await resp.json();
        arvores[idx].ativa = !!data.ativa;
        render(); closeModal();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao alterar status no servidor.');
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
    // images managed separately via gallery API
    const ordem = parseNum(document.getElementById('arvoreOrdem')?.value);
    const familia = (document.getElementById('arvoreFamilia') || {}).value?.trim() ?? '';
    const origem = (document.getElementById('arvoreOrigem') || {}).value?.trim() ?? '';
    const tipo_origem = (document.getElementById('arvoreTipoOrigem') || {}).value?.trim() ?? '';
    const latitude = parseNum(document.getElementById('arvoreLatitude')?.value);
    const longitude = parseNum(document.getElementById('arvoreLongitude')?.value);

    // otimista
    arvores[idx] = {
      ...arvores[idx],
      nome,
      especie,
      familia,
      origem,
      tipo_origem,
      ordem,
      latitude,
      longitude,
      // foto_url left untouched; images are in gallery
    };
    render();

    try {
      const resp = await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          especie,
          familia,
          origem,
          tipo_origem,
          ordem,
          latitude,
          longitude
        })
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

  // ================= FAB (ADICIONAR ÁRVORE) =================
  const fab = document.createElement('button');
  fab.className = 'fab-add';
  fab.title = 'Adicionar árvore';
  fab.appendChild(makePlusSvg());
  document.body.appendChild(fab);

  fab.addEventListener('click', async () => {
    await ensureModal();
    await loadTrilhas();

    const modal = document.getElementById('arvoreAddModal');

    if (!modal) {
      alert('Modal de adicionar árvore não encontrado');
      return;
    }

    [
      'addTrilha',
      'addCodigo',
      'addNome',
      'addEspecie',
      'addFamilia',
      'addOrigem',
      'addTipoOrigem',
      'addOrdem',
      'addLatitude',
      'addLongitude'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // reset new images
    newImages = [];
    renderAddImagesList();

    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');

    // init map in add modal
    (async () => {
      const mapObj = setupMap('arvoreAddMap','addLatitude','addLongitude');
      if (!mapObj) return;
      await mapObj.init();
    })();

    // wire add-image button in add modal
    const btnNew = document.getElementById('btnAddImageNew');
    if (btnNew) {
      btnNew.onclick = () => {
        const url = (document.getElementById('addImageUrl') || {}).value?.trim() || '';
        const legenda = (document.getElementById('addImageLegenda') || {}).value?.trim() || '';
        const fonte = (document.getElementById('addImageFonte') || {}).value?.trim() || '';
        if (!url) { alert('Informe a URL da imagem'); return; }
        newImages.push({ url, legenda, fonte });
        (document.getElementById('addImageUrl') || {}).value = '';
        (document.getElementById('addImageLegenda') || {}).value = '';
        (document.getElementById('addImageFonte') || {}).value = '';
        renderAddImagesList();
      };
    }
  });

  // ===== submit (adicionar árvore) =====
  document.addEventListener('submit', async (e) => {
    if (!(e.target && e.target.id === 'arvoreAddForm')) return;

    e.preventDefault();

    const trilha  = document.getElementById('addTrilha')?.value || '';
    const codigo  = Number(document.getElementById('addCodigo')?.value || 0);
    const nome    = document.getElementById('addNome')?.value?.trim() || '';
    const especie = document.getElementById('addEspecie')?.value?.trim() || '';
    // images handled via gallery; single foto field removed
    const ordem = parseNum(
  document.getElementById('addOrdem')?.value
);

const familia = (
  document.getElementById('addFamilia') || {}
).value?.trim() || '';

const origem = (
  document.getElementById('addOrigem') || {}
).value?.trim() || '';

const tipo_origem = (
  document.getElementById('addTipoOrigem') || {}
).value?.trim() || '';

const latitude = parseNum(
  document.getElementById('addLatitude')?.value
);

const longitude = parseNum(
  document.getElementById('addLongitude')?.value
);

    // pos_x/pos_y removed

    if (!trilha || !codigo || !nome) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      const resp = await authFetch('/api/arvores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trilha_nome: trilha,
          codigo,
          nome,
          especie,
          familia,
          origem,
          tipo_origem,
          ordem,
          latitude,
          longitude,
          foto_url: foto
        })
      });

      const payload = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        throw new Error(payload.error || `Erro ${resp.status}`);
      }

      // if created successfully and we have newImages, attach them
      if (resp.ok && newImages && newImages.length) {
        try {
          for (const img of newImages) {
            await authFetch(`/api/arvores/${encodeURIComponent(trilha)}/${encodeURIComponent(String(codigo))}/images`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(img)
            });
          }
        } catch (ie) { console.error('Falha ao enviar imagens', ie); }
      }

      // recarrega lista do backend
      await loadArvores();
      alert('Árvore adicionada com sucesso!');

      // fecha modal
      const modal = document.getElementById('arvoreAddModal');

      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }

    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao adicionar árvore');
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
      const raw = (Array.isArray(data) ? data : []);

      function ordinal(n) {
        if (n == null || Number.isNaN(Number(n))) return '';
        const num = Number(n);
        const mod100 = num % 100;
        const suffix = (mod100 >= 11 && mod100 <= 13)
          ? 'ª'
          : (num % 10 === 1 ? 'ª' : 'ª');
        return `${num}${suffix}`;
      }

      const map = new Map();

      raw.forEach(a => {
        const key = a.codigo;
        const ordem = a.ordem == null ? null : Number(a.ordem);
        const trilhaInfo = { nome: a.trilha_nome, ordem };

        if (!map.has(key)) {
          map.set(key, {
            ...a,
            codigo: Number(a.codigo),
            trilhas: [trilhaInfo],
            quantidade_perguntas: Number(a.quantidade_perguntas ?? 0),
            ativa: !!a.ativa,
            // pos_x/pos_y removed from UI
            ordem: ordem,
          });
        } else {
          map.get(key).trilhas.push(trilhaInfo);
        }
      });

      const sortByOrdem = trilhaParam != null && trilhaParam !== '';
      arvores = Array.from(map.values()).sort((a, b) => {
        if (sortByOrdem) {
          const oa = a.ordem == null ? Number.POSITIVE_INFINITY : Number(a.ordem);
          const ob = b.ordem == null ? Number.POSITIVE_INFINITY : Number(b.ordem);
          if (oa !== ob) return oa - ob;
        }
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });

      arvores.forEach(a => {
        a.trilhas = a.trilhas.map(t =>
          t.ordem != null ? `${t.nome} (${ordinal(t.ordem)})` : t.nome
        );
      });

      render();
    } catch (err) {
      console.error('Falha ao carregar árvores:', err);
      listRoot.innerHTML = '<p>Erro ao carregar árvores.</p>';
    }
  }

  loadTrilhas();
  loadArvores();
})();
