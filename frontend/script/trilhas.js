// frontend/script/trilhas.js
(function () {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";

  function byId(id) { return document.getElementById(id); }

  function makeMapSvg(stroke = '#1f2937') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const map = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    map.setAttribute('d', 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z');
    map.setAttribute('stroke', stroke);
    map.setAttribute('stroke-width', '1.6');
    map.setAttribute('stroke-linecap', 'round');
    map.setAttribute('stroke-linejoin', 'round');

    const folds = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    folds.setAttribute('d', 'M9 3v15M15 6v15');
    folds.setAttribute('stroke', stroke);
    folds.setAttribute('stroke-width', '1.6');
    folds.setAttribute('stroke-linecap', 'round');

    svg.appendChild(map);
    svg.appendChild(folds);
    return svg;
  }

  function makePlusSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 5v14M5 12h14');
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '2.2');
    path.setAttribute('stroke-linecap', 'round');

    svg.appendChild(path);
    return svg;
  }

  let currentTrilhaNome = '';
  let currentTrilhaAtiva = true;
  let currentPontos = [];
  let draggedCodigo = null;
  let sequenceDirty = false;

  async function ensureAddModal() {
    if (byId('trilhaAddModal')) return true;
    try {
      const resp = await fetch('../partials/modal-trilha-add.html', { cache: 'no-store' });
      if (!resp.ok) return false;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = await resp.text();
      while (wrapper.firstChild) document.body.appendChild(wrapper.firstChild);
      return !!byId('trilhaAddModal');
    } catch (err) {
      console.error('Erro ao carregar modal de adicionar trilha', err);
      return false;
    }
  }

  function closeAddModal() {
    const modal = byId('trilhaAddModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function openAddModal() {
    if (!await ensureAddModal()) {
      alert('Modal de adicionar trilha não encontrado');
      return;
    }
    const form = byId('trilhaAddForm');
    if (form) form.reset();
    const modal = byId('trilhaAddModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    byId('addTrilhaNome')?.focus();
  }

  function setupAddTrilhaButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fab-add';
    button.title = 'Adicionar trilha';
    button.setAttribute('aria-label', 'Adicionar trilha');
    button.appendChild(makePlusSvg());
    button.addEventListener('click', openAddModal);
    document.body.appendChild(button);
  }

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
      trilhas.sort((a, b) => 
        a.nome.localeCompare(b.nome, 'pt-BR')
      );
      console.log('Trilhas recebidas:', trilhas);

      box.innerHTML = '';
      if (!Array.isArray(trilhas) || trilhas.length === 0) {
        box.innerHTML = '<p>Nenhuma trilha encontrada.</p>';
        return;
      }

      trilhas.forEach(r => {
        const el = document.createElement('div');
        el.className = `item${r.ativa === false ? ' is-inactive' : ''}`;

        const body = document.createElement('div');
        body.className = 'item-body';

        const strong = document.createElement('strong');
        strong.className = 'item-title';
        strong.textContent = r.nome;
        body.appendChild(strong);

        const subline = document.createElement('div');
        subline.className = 'subline';
        const span = document.createElement('span');
        span.className = 'meta';
        const pontosAtivos = Number(r.quantidade_pontos_interesse ?? 0);
        const pontosTotais = Number(r.quantidade_pontos_interesse_total ?? 0);
        const arvores = Number(r.quantidade_arvores_tipo ?? 0);
        const predios = Number(r.quantidade_predios ?? 0);
        const composicao = arvores && predios
          ? 'Árvores e prédios'
          : arvores
            ? 'Árvores'
            : predios
              ? 'Prédios'
              : 'Sem pontos';
        span.textContent = `${pontosAtivos} pontos ativos • ${pontosTotais} pontos totais • ${composicao}`;
        subline.appendChild(span);
        body.appendChild(subline);
        el.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'item-actions';

        const mapBtn = document.createElement('button');
        mapBtn.type = 'button';
        mapBtn.className = 'edit-pill';
        mapBtn.title = 'Alterar sequência e visualizar mapa';
        mapBtn.setAttribute('aria-label', `Alterar sequência da trilha ${r.nome}`);
        mapBtn.dataset.trilha = r.nome;
        mapBtn.appendChild(makeMapSvg());
        mapBtn.onclick = (ev) => {
          ev.stopPropagation();
          openTrilhaMap(r.nome, r.ativa !== false);
        };
        actions.appendChild(mapBtn);

        el.appendChild(actions);

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

  document.addEventListener('click', (event) => {
    if (event.target.closest('#trilhaAddModal [data-close]')) closeAddModal();
  });

  document.addEventListener('submit', async (event) => {
    if (event.target?.id !== 'trilhaAddForm') return;
    event.preventDefault();

    const nome = byId('addTrilhaNome')?.value.trim() || '';
    if (!nome) {
      alert('Informe o nome da trilha.');
      return;
    }

    try {
      const resp = await authFetch(`${API_BASE}/api/trilhas`, {
        method: 'POST',
        body: JSON.stringify({ nome })
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload.error || `Erro ${resp.status}`);

      closeAddModal();
      await carregarTrilhas();
      alert('Trilha adicionada com sucesso!');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erro ao adicionar trilha');
    }
  });
  // ===== Map modal helpers =====
  async function ensureMapModalExists() {
    if (document.getElementById('trilhaMapModal')) return true;
    try {
      let resp = await fetch('../partials/modal-trilha-mapa.html');
      if (!resp.ok) resp = await fetch('/frontend/partials/modal-trilha-mapa.html');
      if (!resp.ok) return false;
      const html = await resp.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      while (div.firstChild) document.body.appendChild(div.firstChild);
      return !!document.getElementById('trilhaMapModal');
    } catch (e) {
      console.error('Erro ao carregar partial do modal de mapa', e);
      return false;
    }
  }

  async function openTrilhaMap(trilhaNome, ativa = true) {
    if (!await ensureMapModalExists()) {
      alert('Não foi possível abrir a edição da sequência.');
      return;
    }
    const modal = document.getElementById('trilhaMapModal');
    const title = document.getElementById('trilhaMapTitle');
    currentTrilhaNome = trilhaNome;
    currentTrilhaAtiva = ativa;
    sequenceDirty = false;
    if (title) title.textContent = `Sequência — ${trilhaNome}`;
    renderTrilhaActiveButton();
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('open');
    }

    try {
      const resp = await fetch(`${API_BASE}/api/arvores?tipo=all&trilha=${encodeURIComponent(trilhaNome)}`);
      if (!resp.ok) throw new Error('Falha ao buscar pontos de interesse');
      currentPontos = await resp.json();
      renderSequenceList();
      await initTrilhaMap(currentPontos);
    } catch (e) {
      console.error('Erro ao carregar pontos para o mapa', e);
      const list = document.getElementById('trilhaSequenceList');
      if (list) list.innerHTML = '<li class="trilha-sequence-empty">Erro ao carregar os pontos desta trilha.</li>';
      setSequenceStatus('Não foi possível carregar os pontos da trilha.');
    }
  }

  function setSequenceStatus(message) {
    const status = document.getElementById('trilhaSequenceStatus');
    if (status) status.textContent = message;
  }

  function renderTrilhaActiveButton() {
    const button = byId('toggleTrilhaActive');
    if (!button) return;
    button.classList.toggle('danger', currentTrilhaAtiva);
    button.classList.toggle('success', !currentTrilhaAtiva);
    button.textContent = currentTrilhaAtiva ? 'Desativar trilha' : 'Ativar trilha';
    button.setAttribute('aria-label', `${currentTrilhaAtiva ? 'Desativar' : 'Ativar'} trilha ${currentTrilhaNome}`);
    button.title = button.getAttribute('aria-label');
  }

  async function toggleCurrentTrilhaActive() {
    const button = byId('toggleTrilhaActive');
    if (!button) return;
    const nextAtiva = !currentTrilhaAtiva;
    const acao = nextAtiva ? 'ativar' : 'desativar';
    if (!window.confirm(`Deseja ${acao} a trilha "${currentTrilhaNome}"?`)) return;

    button.disabled = true;
    try {
      const response = await authFetch(`${API_BASE}/api/trilhas/${encodeURIComponent(currentTrilhaNome)}/ativa`, {
        method: 'PUT',
        body: JSON.stringify({ ativa: nextAtiva })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Erro ${response.status}`);
      currentTrilhaAtiva = payload.ativa !== false;
      renderTrilhaActiveButton();
      setSequenceStatus(currentTrilhaAtiva ? 'Trilha ativada.' : 'Trilha desativada.');
      await carregarTrilhas();
    } catch (error) {
      setSequenceStatus(error.message || 'Erro ao alterar status da trilha.');
    } finally {
      button.disabled = false;
    }
  }

  function renderSequenceList() {
    const list = document.getElementById('trilhaSequenceList');
    const count = document.getElementById('trilhaSequenceCount');
    const saveButton = document.getElementById('saveTrilhaSequence');
    if (!list) return;
    list.replaceChildren();
    if (count) count.textContent = `${currentPontos.length} ${currentPontos.length === 1 ? 'ponto' : 'pontos'}`;
    if (saveButton) saveButton.disabled = !sequenceDirty;

    if (!currentPontos.length) {
      const empty = document.createElement('li');
      empty.className = 'trilha-sequence-empty';
      empty.textContent = 'Esta trilha ainda não tem pontos associados.';
      list.appendChild(empty);
      return;
    }

    currentPontos.forEach((ponto, index) => {
      const item = document.createElement('li');
      item.className = 'trilha-sequence-item';
      if (ponto.tipo === 'predio_historico') item.classList.add('is-building');
      if (!ponto.ativa) item.classList.add('is-inactive');
      item.draggable = true;
      item.dataset.codigo = String(ponto.codigo);

      const number = document.createElement('span');
      number.className = 'trilha-sequence-number';
      number.textContent = String(index + 1);
      number.setAttribute('aria-hidden', 'true');

      const grip = document.createElement('span');
      grip.className = 'trilha-sequence-grip';
      grip.textContent = '⠿';
      grip.setAttribute('aria-hidden', 'true');

      const name = document.createElement('span');
      name.className = 'trilha-sequence-name';
      name.textContent = ponto.nome || `${ponto.tipo === 'predio_historico' ? 'Prédio' : 'Árvore'} ${ponto.codigo}`;
      const type = document.createElement('span');
      type.className = 'trilha-sequence-type';
      type.textContent = ponto.tipo === 'predio_historico' ? 'Prédio histórico' : 'Árvore';
      name.appendChild(type);

      const controls = document.createElement('span');
      controls.className = 'trilha-sequence-controls';
      [['↑', 'Mover para cima', index === 0], ['↓', 'Mover para baixo', index === currentPontos.length - 1]].forEach(([label, action, disabled], direction) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.title = action;
        button.setAttribute('aria-label', `${action}: ${name.firstChild.textContent}`);
        button.disabled = disabled;
        button.addEventListener('click', () => moveSequencePoint(index, index + (direction === 0 ? -1 : 1)));
        controls.appendChild(button);
      });

      item.append(number, grip, name, controls);
      list.appendChild(item);
    });
  }

  function moveSequencePoint(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= currentPontos.length || fromIndex === toIndex) return;
    const [point] = currentPontos.splice(fromIndex, 1);
    currentPontos.splice(toIndex, 0, point);
    sequenceDirty = true;
    renderSequenceList();
    setSequenceStatus('Ordem alterada. Alterações não salvas.');
    initTrilhaMap(currentPontos);
  }

  function setupSequenceInteractions() {
    document.addEventListener('dragstart', event => {
      const item = event.target.closest('#trilhaSequenceList .trilha-sequence-item');
      if (!item) return;
      draggedCodigo = item.dataset.codigo;
      item.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', draggedCodigo);
    });

    document.addEventListener('dragend', event => {
      const item = event.target.closest('#trilhaSequenceList .trilha-sequence-item');
      item?.classList.remove('is-dragging');
      document.querySelectorAll('.trilha-sequence-item.is-drop-target').forEach(row => row.classList.remove('is-drop-target'));
      draggedCodigo = null;
    });

    document.addEventListener('dragover', event => {
      const item = event.target.closest('#trilhaSequenceList .trilha-sequence-item');
      if (!item) return;
      event.preventDefault();
      item.classList.add('is-drop-target');
      event.dataTransfer.dropEffect = 'move';
    });

    document.addEventListener('dragleave', event => {
      const item = event.target.closest('#trilhaSequenceList .trilha-sequence-item');
      if (item && !item.contains(event.relatedTarget)) item.classList.remove('is-drop-target');
    });

    document.addEventListener('drop', event => {
      const target = event.target.closest('#trilhaSequenceList .trilha-sequence-item');
      if (!target || !draggedCodigo) return;
      event.preventDefault();
      const fromIndex = currentPontos.findIndex(point => String(point.codigo) === draggedCodigo);
      let toIndex = currentPontos.findIndex(point => String(point.codigo) === target.dataset.codigo);
      const bounds = target.getBoundingClientRect();
      if (event.clientY >= bounds.top + bounds.height / 2) toIndex += 1;
      if (fromIndex < toIndex) toIndex -= 1;
      moveSequencePoint(fromIndex, toIndex);
      draggedCodigo = null;
    });

    document.addEventListener('click', event => {
      if (event.target.closest('#trilhaMapModal [data-close]')) {
        const modal = document.getElementById('trilhaMapModal');
        if (sequenceDirty && !window.confirm('Há uma sequência não salva. Fechar e descartar as alterações?')) return;
        modal?.classList.remove('open');
        modal?.setAttribute('aria-hidden', 'true');
      }
      if (event.target.closest('#saveTrilhaSequence')) saveTrilhaSequence();
      if (event.target.closest('#toggleTrilhaActive')) toggleCurrentTrilhaActive();
    });
  }

  async function saveTrilhaSequence() {
    const saveButton = document.getElementById('saveTrilhaSequence');
    if (!saveButton || !sequenceDirty) return;
    saveButton.disabled = true;
    setSequenceStatus('Salvando sequência...');
    try {
      const resp = await authFetch(`${API_BASE}/api/trilhas/${encodeURIComponent(currentTrilhaNome)}/pontos/ordem`, {
        method: 'PUT',
        body: JSON.stringify({ pontos: currentPontos.map(ponto => Number(ponto.codigo)) })
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload.error || `Erro ${resp.status}`);
      sequenceDirty = false;
      currentPontos.forEach((ponto, index) => { ponto.ordem = index + 1; });
      renderSequenceList();
      const modal = document.getElementById('trilhaMapModal');
      modal?.classList.remove('open');
      modal?.setAttribute('aria-hidden', 'true');
      await carregarTrilhas();
    } catch (error) {
      saveButton.disabled = false;
      setSequenceStatus(error.message || 'Não foi possível salvar a sequência.');
    }
  }

  function loadGoogleMaps(apiKey) {
    return new Promise((resolve, reject) => {
      if (window.google && window.google.maps) return resolve(window.google.maps);
      if (!apiKey) return reject(new Error('Google Maps API key não configurada'));
      const src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve(window.google.maps);
      s.onerror = () => reject(new Error('Falha ao carregar Google Maps API'));
      document.head.appendChild(s);
    });
  }

  async function initTrilhaMap(arvores) {
    const canvas = document.getElementById('trilhaMapCanvas');
    if (!canvas) return;
    canvas.innerHTML = '';

    const apiKey = window.__GOOGLE_MAPS_API_KEY__ || '';
    try {
      const maps = await loadGoogleMaps(apiKey);
      const map = new maps.Map(canvas, { center: { lat: 0, lng: 0 }, zoom: 14 });
      const bounds = new maps.LatLngBounds();

      let any = false;
      const route = [];
      const infoWindow = new maps.InfoWindow();
      arvores.forEach((a, index) => {
        const lat = a.latitude == null ? null : Number(a.latitude);
        const lng = a.longitude == null ? null : Number(a.longitude);
        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return;
        any = true;
        const pos = { lat, lng };
        route.push(pos);
        const isBuilding = a.tipo === 'predio_historico';
        const color = a.ativa ? (isBuilding ? '#8B5E3C' : '#4F6F52') : '#6B7280';
        const typeGlyph = isBuilding
          ? `<path d='M31 4h6v8h-6z' fill='${color}'/><path d='M32 5.5h1v1h-1zm3 0h1v1h-1zm-3 2h1v1h-1zm3 0h1v1h-1z' fill='#fff'/>`
          : `<path d='M34 3.5 31.2 7h1.7l-2.1 2.8H33V12h2V9.8h2.2L35 7h1.8z' fill='${color}'/>`;
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 42 44'><path d='M18 1C11.4 1 6 6.4 6 13c0 8.7 12 28 12 28s12-19.3 12-28C30 6.4 24.6 1 18 1z' fill='${color}'/><circle cx='18' cy='14' r='8.5' fill='#fff'/><circle cx='34' cy='8' r='7.5' fill='#fff' stroke='${color}' stroke-width='1.5'/>${typeGlyph}</svg>`;
        const icon = {
          url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
          scaledSize: new maps.Size(42, 44),
          anchor: new maps.Point(18, 41),
          labelOrigin: new maps.Point(18, 14)
        };
        const tipoLabel = a.tipo === 'predio_historico' ? 'Prédio' : 'Árvore';
        const marker = new maps.Marker({
          position: pos,
          map,
          title: `${index + 1}. ${a.nome || `${tipoLabel} ${a.codigo}`}`,
          icon,
          label: { text: String(index + 1), color, fontSize: '10px', fontWeight: '700' }
        });
        marker.addListener('click', () => {
          const ordemText = String(index + 1);
          const safeName = (a.nome || `${tipoLabel} ${a.codigo}`).replace(/</g, '&lt;');
          const latText = (a.latitude == null) ? '—' : String(a.latitude);
          const lngText = (a.longitude == null) ? '—' : String(a.longitude);
          const trilhaForLink = a.trilha_nome || '';
          // use absolute path to ensure query param reaches the arvores page
          const page = a.tipo === 'predio_historico' ? 'predios.html' : 'arvores.html';
          const link = `${location.origin}/pages/${page}?trilha=${encodeURIComponent(trilhaForLink)}`;
          const html = `
            <div style="min-width:180px">
              <strong>${safeName}</strong>
              <div>Ordem: ${ordemText}</div>
              <div>Lat: ${latText} &nbsp; Lng: ${lngText}</div>
              <div style="margin-top:6px"><a href="${link}">Ver na página</a></div>
            </div>`;
          infoWindow.setContent(html);
          infoWindow.open(map, marker);
        });
        bounds.extend(pos);
      });

      if (route.length > 1) {
        new maps.Polyline({
          path: route,
          geodesic: true,
          strokeColor: '#4F6F52',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map
        });
      }
      if (any) {
        map.fitBounds(bounds);
      } else {
        canvas.innerHTML = '<p class="trilha-sequence-empty">Nenhum ponto possui coordenadas para exibir no mapa.</p>';
      }
    } catch (e) {
      console.error(e);
      canvas.innerHTML = `<p class="trilha-sequence-empty">${e.message}</p>`;
    }
  }

  // espera o DOM
  document.addEventListener('DOMContentLoaded', () => {
    setupSequenceInteractions();
    setupAddTrilhaButton();
    carregarTrilhas();
  });
})();
