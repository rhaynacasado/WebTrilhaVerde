// frontend/script/trilhas.js
(function () {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";

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

        // botão de mapa (similar ao lápis em `arvore.js`)
        const mapBtn = document.createElement('button');
        mapBtn.type = 'button';
        mapBtn.className = 'map-pill';
        mapBtn.title = 'Visualizar mapa';
        mapBtn.dataset.trilha = r.nome;
        mapBtn.textContent = '🗺️';
        mapBtn.onclick = (ev) => {
          ev.stopPropagation();
          console.log('mapBtn clicked for trilha:', r.nome);
          openTrilhaMap(r.nome);
        };

        el.appendChild(mapBtn);

        el.onclick = () => {
          window.location.href = `arvores?trilha=${encodeURIComponent(r.nome)}`;
        };

        box.appendChild(el);
      });
    } catch (err) {
      console.error('Exceção no carregarTrilhas:', err);
      byId('trilhasList').innerHTML = '<p>Erro inesperado ao carregar trilhas.</p>';
    }
  }
  // ===== Map modal helpers =====
  async function ensureMapModalExists() {
    if (document.getElementById('trilhaMapModal')) return;
    try {
      // tenta primeiro relativo à página
      let resp = await fetch('../partials/modal-trilha-mapa.html');
      if (!resp.ok) {
        console.warn('fetch ../partials failed, tentando /frontend/partials/...');
        resp = await fetch('/frontend/partials/modal-trilha-mapa.html');
      }
      console.log('Carregando partial do modal de mapa:', resp.status);
      if (!resp.ok) return;
      const html = await resp.text();
      const div = document.createElement('div');
      div.innerHTML = html;
      // append children to body
      while (div.firstChild) document.body.appendChild(div.firstChild);

      // close handlers
      document.querySelectorAll('#trilhaMapModal [data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
          const modal = document.getElementById('trilhaMapModal');
          if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            modal.classList.remove('open');
          }
        });
      });
      console.log('Modal de mapa inserido no DOM.');
    } catch (e) {
      console.error('Erro ao carregar partial do modal de mapa', e);
    }
  }

  async function openTrilhaMap(trilhaNome) {
    console.log('openTrilhaMap:', trilhaNome);
    await ensureMapModalExists();
    const modal = document.getElementById('trilhaMapModal');
    const title = document.getElementById('trilhaMapTitle');
    if (title) title.textContent = `Mapa — ${trilhaNome}`;
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.classList.add('open');
    }

    // load trees and initialize map
    try {
      console.log('Buscando árvores para trilha (API):', trilhaNome);
      const resp = await fetch(`${API_BASE}/api/arvores?trilha=${encodeURIComponent(trilhaNome)}`);
      if (!resp.ok) throw new Error('Falha ao buscar árvores');
      const arvores = await resp.json();
      console.log('Árvores recebidas para mapa:', arvores);
      await initTrilhaMap(arvores || []);
    } catch (e) {
      console.error('Erro ao carregar árvores para o mapa', e);
      const canvas = document.getElementById('trilhaMapCanvas');
      if (canvas) canvas.innerHTML = '<p style="padding:16px">Erro ao carregar mapa ou árvores.</p>';
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
      let markersCount = 0;
      console.log('Inicializando marcadores no mapa para', arvores.length, 'árvores');
      const infoWindow = new maps.InfoWindow();
      arvores.forEach(a => {
        const lat = a.latitude == null ? null : Number(a.latitude);
        const lng = a.longitude == null ? null : Number(a.longitude);
        console.log('Árvore', a.codigo, 'lat=', a.latitude, 'lng=', a.longitude);
        if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return;
        any = true;
        const pos = { lat, lng };
        // ícone em forma de pin — duas cores: ativa (verde) / inativa (cinza)
        const isActive = !!a.ativa;
        const color = isActive ? '#0F9D58' : '#EA4335'; // #898989
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z' fill='${color}'/><circle cx='12' cy='9' r='2.5' fill='%23ffffff'/></svg>`;
        const icon = {
          url: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg),
          scaledSize: new maps.Size(30, 30),
          anchor: new maps.Point(15, 30)
        };
        const marker = new maps.Marker({ position: pos, map, title: a.nome || `Árvore ${a.codigo}`, icon });
        // ao clicar no pin mostra nome e ordem na trilha
        marker.addListener('click', () => {
          const ordemText = (a.ordem == null) ? '—' : String(a.ordem);
          const safeName = (a.nome || `Árvore ${a.codigo}`).replace(/</g, '&lt;');
          const latText = (a.latitude == null) ? '—' : String(a.latitude);
          const lngText = (a.longitude == null) ? '—' : String(a.longitude);
          const trilhaForLink = a.trilha_nome || '';
          // use absolute path to ensure query param reaches the arvores page
          const link = `${location.origin}/pages/arvores.html?trilha=${encodeURIComponent(trilhaForLink)}`;
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
        markersCount++;
        bounds.extend(pos);
      });

      console.log('Marcadores adicionados:', markersCount);
      if (any) {
        map.fitBounds(bounds);
      } else {
        canvas.innerHTML = '<p style="padding:16px">Nenhuma árvore com latitude/longitude nesta trilha.</p>';
      }
    } catch (e) {
      console.error(e);
      canvas.innerHTML = `<p style="padding:16px">${e.message}</p>`;
    }
  }

  // espera o DOM
  document.addEventListener('DOMContentLoaded', carregarTrilhas);
})();
