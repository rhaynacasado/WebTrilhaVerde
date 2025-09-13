// Dados do usuário em memória
let userData = {
  name: 'Trilha Verde',
  email: 'trilhaverde@usp.br',
  picurl: '../img/avatar.png',
  vinculo: 'externo'
};

// FUNÇÃO PARA PEGAR DADOS DO USUÁRIO
function getUser() {
  return userData;
}

// FUNÇÃO PARA ATUALIZAR DADOS DO USUÁRIO
function setUser(newData) {
  userData = { ...userData, ...newData };
}

/* PARTIALS - TOPBAR */ 

function loadTopBar() {
  const user = getUser();

  const img = document.getElementById('topbar-pic');
  const nameElem = document.getElementById('topbar-name');
  const emailElem = document.getElementById('topbar-email');

  if (img) img.src = user.picurl;
  if (nameElem) nameElem.textContent = user.name;
  if (emailElem) emailElem.textContent = user.email;
}


/* PARTIALS - SIDEBAR */ 

function loadSideBar() {
  // -------- Navegação de páginas --------
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
  
  /* PAGES FUNCTIONS */ 
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".menu-item").forEach(link => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}
  
// inicializa carregamento de partials
loadPartials();


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

    // div.who
    const divWho = document.createElement('div');
    divWho.classList.add('who');

    // badge
    const badge = document.createElement('span');
    badge.classList.add('badge');
    badge.textContent = '🙂';

    // container do nome + ação
    const divText = document.createElement('div');

    const strong = document.createElement('strong');
    strong.textContent = a.quem;

    const br = document.createElement('br');

    const spanAcao = document.createElement('span');
    spanAcao.classList.add('acao');
    spanAcao.textContent = a.acao;

    divText.appendChild(strong);
    divText.appendChild(br);
    divText.appendChild(spanAcao);

    divWho.appendChild(badge);
    divWho.appendChild(divText);

    // span.time
    const spanTime = document.createElement('span');
    spanTime.classList.add('time');
    spanTime.textContent = a.quando;

    // monta no li
    li.appendChild(divWho);
    li.appendChild(spanTime);

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

  const trilhasList = document.getElementById('trilhasList');

  trilhas.forEach(r => {
    const el = document.createElement('div');
    el.className = 'item';

    const strong = document.createElement('strong');
    strong.className = 'item-title';
    strong.textContent = r.nome;
    el.appendChild(strong);

    const span = document.createElement('span');
    span.className = 'meta';
    span.textContent = `${r.itens} pontos • ${r.status}`;
    el.appendChild(span);
    
    trilhasList.appendChild(el)
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

  const arvoresList = document.getElementById('arvoresList');

  arvores.forEach(r => {
    const el = document.createElement('div');
    el.className = 'item';

    const strong = document.createElement('strong');
    strong.className = 'item-title';
    strong.textContent = r.nome;
    el.appendChild(strong);

    const span = document.createElement('span');
    span.className = 'meta';
    span.textContent = `${r.plantadas} plantadas • ${r.regiao}`;
    el.appendChild(span);
    
    arvoresList.appendChild(el)
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
  
  const perguntasList = document.getElementById('perguntasList');

  perguntas.forEach(r => {
    const el = document.createElement('div');
    el.className = 'item';

    const strong = document.createElement('strong');
    strong.className = 'item-title';
    strong.textContent = r.titulo;
    el.appendChild(strong);

    const span = document.createElement('span');
    span.className = 'meta';
    span.textContent = `por ${r.autor} • ${r.respostas} respostas`;
    el.appendChild(span);
    
    perguntasList.appendChild(el)
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

    const tdData = document.createElement('td');
    tdData.textContent = l.data;
    tr.appendChild(tdData);

    const tdNivel = document.createElement('td');
    tdNivel.textContent = l.nivel;
    tr.appendChild(tdNivel);

    const tdEvento = document.createElement('td');
    tdEvento.textContent = l.evento;
    tr.appendChild(tdEvento);

    logBody.appendChild(tr);
  });
}

/* PAGES - PERFIL */ 
const pagePerfil = document.getElementById('pagePerfil') !== null;
if (pagePerfil) {
  const user = getUser();

  const profilePic = document.getElementById('profile-pic');
  const inputNome = document.getElementById('inputNome');
  const inputEmail = document.getElementById('inputEmail');
  const inputVinculo = document.getElementById('inputVinculo');
  const fileInput = document.getElementById('fileInput');
  const editButton = document.querySelector('.edit-photo');
  const saveButton = document.querySelector('.profile-actions .primary');

  // Inicializa campos
  profilePic.src = user.picurl;
  inputNome.value = user.name;
  inputEmail.value = user.email;
  inputVinculo.value = user.vinculo;

  document.getElementById('profileNome').textContent = userData.name;
  document.getElementById('profileEmail').textContent = userData.email;

  // --- Trocar foto ---
  editButton.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(evt) {
        profilePic.src = evt.target.result; // Atualiza a imagem na tela
      };
      reader.readAsDataURL(file);
    }
  });

  // --- Salvar alterações ---
  saveButton.addEventListener('click', (e) => {
    e.preventDefault();

    // Atualiza userData
    setUser({
      name: inputNome.value,
      email: inputEmail.value,
      vinculo: inputVinculo.value,
      picurl: profilePic.src
    });

    // Atualiza a própria página
    document.getElementById('profileNome').textContent = userData.name;
    document.getElementById('profileEmail').textContent = userData.email;

    // --- Atualiza topbar ---
    const topbarPic = document.getElementById('topbar-pic');
    const topbarName = document.getElementById('topbar-name');
    const topbarEmail = document.getElementById('topbar-email');

    if (topbarPic) topbarPic.src = userData.picurl;
    if (topbarName) topbarName.textContent = userData.name;
    if (topbarEmail) topbarEmail.textContent = userData.email;
  });
}