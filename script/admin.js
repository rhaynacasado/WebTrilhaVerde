// TROCAR TODOS INNERHTML POR APPEND CHILD


/* PARTIALS - TOPBAR */ 

function loadTopBar() {
  const user = { 
    name: 'Trilha Verde', 
    email: 'trilhaverde@usp.br', 
    picurl: '../img/avatar.png' 
  };

  const profilePicture = document.createElement('div');
  profilePicture.className = 'profile-pic';
  profilePicture.innerHTML = `<img src="${user.picurl}" alt="Foto de perfil">`;

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  userInfo.innerHTML = `
    <strong>${user.name}</strong>
    <small>${user.email}</small>
  `;

  const userContainer = document.querySelector('.topbar .user');
  if (userContainer) {
    userContainer.append(userInfo);
    userContainer.append(profilePicture);
  }
}


/* PARTIALS - SIDEBAR */ 

function loadSideBar() {
  // -------- Navegação ee páginas --------
  const menuButtons = document.querySelectorAll('.menu-item');
  const pages = document.querySelectorAll('.page');

  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      menuButtons.forEach(b => b.classList.toggle('active', b === btn));
      pages.forEach(p => p.classList.toggle('visible', p.id === `page-${page}`));
    });
  });

    // -------- Botão de Sair --------
  const sairBtn = document.getElementById('sairBtn');
  if (sairBtn) {
    sairBtn.addEventListener('click', (e) => {
      e.preventDefault(); // evita comportamento padrão
      window.location.href = "../acesso.html"; // redireciona
    });
  }
}


/* PARTIALS FUNCTIONS */ 

async function loadPartials() {
  document.getElementById("sidebar").innerHTML =
    await (await fetch("../partials/sidebar.html")).text();
  document.getElementById("topbar").innerHTML =
    await (await fetch("../partials/topbar.html")).text();

  // depois que topbar for carregado, insere o usuário
  loadTopBar();
  loadSideBar();
}

// inicializa carregamento de partials
loadPartials();


/* PAGES FUNCTIONS */ 

function renderList(containerId, rows, builder){
  const wrap = document.getElementById(containerId);
  wrap.innerHTML = '';
  rows.forEach(r => wrap.appendChild(builder(r)));
}


/* PAGES - DASHBOARD */ 

const pageDashboard = document.getElementById('pageDashboard') !== null;

if(pageDashboard){
  // -------- KPIs de exemplo --------
  const kpis = {
    usuarios: { total: 120, delta: '+7 vs semana passada' },
    trilhas: { total: 1, delta: '+4 vs semana passada' },
    arvores: { total: 80, delta: '+5 vs semana passada' },
    perguntas: { total: 28, delta: '+3 vs semana passada' }
  };
  document.getElementById('kpiUsuarios').textContent = kpis.usuarios.total;
  document.getElementById('kpiUsuariosDelta').textContent = kpis.usuarios.delta;
  document.getElementById('kpiTrilhas').textContent = kpis.trilhas.total;
  document.getElementById('kpiTrilhasDelta').textContent = kpis.trilhas.delta;
  document.getElementById('kpiArvores').textContent = kpis.arvores.total;
  document.getElementById('kpiArvoresDelta').textContent = kpis.arvores.delta;
  document.getElementById('kpiPerguntas').textContent = kpis.perguntas.total;
  document.getElementById('kpiPerguntasDelta').textContent = kpis.perguntas.delta;

  // -------- Donut de progresso --------
  function setDonut(percent){
    const r = 52;
    const circ = 2 * Math.PI * r;
    const dash = `${(percent/100)*circ} ${circ}`;
    document.querySelector('.donut-indicator').setAttribute('stroke-dasharray', dash);
    document.getElementById('donutLabel').textContent = `${percent}%`;
  }
  setDonut(41);

  // -------- Barras semanais --------
  const semana = [24, 36, 52, 70, 48, 30, 58]; // dados fictícios
  const barsWrap = document.getElementById('bars');
  semana.forEach(v => {
    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('i');
    fill.style.height = Math.min(100, Math.max(0, v)) + '%';
    bar.appendChild(fill);
    barsWrap.appendChild(bar);
  });

  // -------- Atividades Recentes --------
  const atividades = [
    { quem: 'Maria Silva', acao: 'Editou uma árvore', quando: 'Hoje' },
    { quem: 'João Pedro', acao: 'Criou uma pergunta', quando: 'Ontem' },
    { quem: 'Ana Júlia', acao: 'Ativou uma árvore', quando: '2 dias atrás' }
  ];
  const activityList = document.getElementById('activityList');
  atividades.forEach(a => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="who"><span class="badge">🙂</span>
        <div ><strong class="activity-info">${a.quem}</strong><br><span class="activity-info">${a.acao}</span></div>
      </div>
      <span class="time">${a.quando}</span>`;
    activityList.appendChild(li);
  });
}


/* PAGES - TRILHAS */ 

const pageTrilhas = document.getElementById('pageTrilhas') !== null;

if(pageTrilhas){
  const trilhas = [
    { nome: 'Trilha das Araucárias', status: 'Ativa', itens: 12 },
    { nome: 'Caminho do Rio Claro', status: 'Rascunho', itens: 7 },
    { nome: 'Serra do Mel', status: 'Ativa', itens: 19 },
  ];

  renderList('trilhasList', trilhas, r => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<strong class="item-title">${r.nome}</strong>
      <span class="meta">${r.itens} pontos • ${r.status}</span>`;
    return el;
  });
}


/* PAGES - ARVORES */ 

const arvoresList = document.getElementById('arvoresList') !== null;

if(arvoresList){
  const arvores = [
    { nome: 'Ipê Amarelo', plantadas: 24, regiao: 'Zona Norte' },
    { nome: 'Araucária', plantadas: 12, regiao: 'Serra' },
    { nome: 'Pau-Brasil', plantadas: 5, regiao: 'Litoral' },
  ];

  renderList('arvoresList', arvores, r => {
    console.log("admin.js carregado");
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<strong class="item-title">${r.nome}</strong>
      <span class="meta">${r.plantadas} plantadas • ${r.regiao}</span>`;
    return el;
  });
}


/* PAGES - PERGUNTAS */ 

const pagePerguntas = document.getElementById('pagePerguntas') !== null;

if(pagePerguntas){
  const perguntas = [
    { titulo: 'Qual melhor época pra plantar araucária?', autor: 'Marcos', respostas: 4 },
    { titulo: 'Dúvida sobre irrigação automatizada', autor: 'Helena', respostas: 2 },
    { titulo: 'Como medir crescimento de mudas?', autor: 'Rafa', respostas: 6 },
  ];
  
  renderList('perguntasList', perguntas, r => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<strong class="item-title">${r.titulo}</strong>
      <span class="meta">por ${r.autor} • ${r.respostas} respostas</span>`;
    return el;
  });
}


/* PAGES - LOG */ 

const pageLog = document.getElementById('pageLog') !== null;

if(pageLog){
  const logs = [
    { data: '2025-08-24 10:12', nivel: 'INFO', evento: 'Backup concluído com sucesso.' },
    { data: '2025-08-24 09:02', nivel: 'WARN', evento: 'Uso de disco acima de 80%.' },
    { data: '2025-08-23 22:41', nivel: 'INFO', evento: 'Usuário João Pedro criou trilha “Serra do Mel”.' },
    { data: '2025-08-23 20:15', nivel: 'ERROR', evento: 'Falha ao sincronizar mapa de calor.' }
  ];

  const logBody = document.querySelector('#logTable tbody');
  logs.forEach(l => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${l.data}</td><td>${l.nivel}</td><td>${l.evento}</td>`;
    logBody.appendChild(tr);
  });
}
