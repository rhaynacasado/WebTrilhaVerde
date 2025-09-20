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

function loadSideBar() {
  const menuButtons = document.querySelectorAll('.menu-item');
  const pages = document.querySelectorAll('.page');

  menuButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      menuButtons.forEach(b => b.classList.toggle('active', b === btn));
      pages.forEach(p => p.classList.toggle('visible', p.id === `page-${page}`));
    });
  });

  document.querySelectorAll('.menu-item').forEach(el => {
    // tenta pegar um span que não seja o de ícone
    const labelNode = el.querySelector('span:not(.icon)');
    const label = (labelNode ? labelNode.textContent : el.textContent).trim();
    if (label) {
      el.setAttribute('title', label);
      el.setAttribute('aria-label', label);
    }
  });

  // -------- Botão de Sair --------
  const sairBtn = document.getElementById('sairBtn');
  if (sairBtn) {
    sairBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = "../login.html";
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