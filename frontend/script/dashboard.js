(function initDashboard() {
  const API_BASE = window.__API_BASE__ || 'http://127.0.0.1:3001';

  // util do donut
  function setDonut(percent){
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = `${(percent/100)*circ} ${circ}`;
    const ring = document.querySelector('.donut-indicator');
    if (ring) ring.setAttribute('stroke-dasharray', dash);
    const lbl = document.getElementById('donutLabel');
    if (lbl) lbl.textContent = `${percent}%`;
  }

  // pega dados do backend
  fetch(`${API_BASE}/api/dashboard/summary`)
    .then(r => r.json())
    .then(data => {
      // KPIs (título + valor — sem o traço/delta)
      const k = data.kpis || {};
      setText('kpiUsuarios',  k.usuarios ?? 0);
      setText('kpiTrilhas',   k.trilhas ?? 0);
      setText('kpiArvores',   k.arvores ?? 0);
      setText('kpiPerguntas', k.perguntas ?? 0);

      // esconde linhas "delta" se existirem
      hideIfExists('kpiUsuariosDelta');
      hideIfExists('kpiTrilhasDelta');
      hideIfExists('kpiArvoresDelta');
      hideIfExists('kpiPerguntasDelta');

      // Donut: renomeia título e aplica %
      setText('donutTitle', 'Árvores ativas');
      setDonut((data.donut && data.donut.percent) || 0);

      // Atividades recentes (máx 5 já vem do backend)
      const ul = document.getElementById('activityList');
      if (ul) {
        ul.innerHTML = '';
        (data.activities || []).forEach(a => {
          const li = document.createElement('li');

          const who = document.createElement('div');
          who.className = 'who';
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = '🙂';
          const whoText = document.createElement('div');
          const strong = document.createElement('strong');
          strong.textContent = a.quemEmail?.split('@')[0] || '—';
          const br = document.createElement('br');
          const spanAcao = document.createElement('span');
          spanAcao.className = 'acao';
          spanAcao.textContent = a.atividade;

          whoText.appendChild(strong);
          whoText.appendChild(br);
          whoText.appendChild(spanAcao);
          who.appendChild(badge);
          who.appendChild(whoText);

          const time = document.createElement('span');
          time.className = 'time';
          time.textContent = new Date(a.quando).toLocaleString('pt-BR');

          li.appendChild(who);
          li.appendChild(time);
          ul.appendChild(li);
        });
      }
    })
    .catch(err => console.error(err));

  function setText(id, v){ const el = document.getElementById(id); if (el) el.textContent = v; }
  function hideIfExists(id){ const el = document.getElementById(id); if (el) el.style.display = 'none'; }
})();
