// frontend/script/admin.js

// Base da API (pode sobrescrever no HTML: window.__API_BASE__ = "https://api...";)
const API_BASE = window.__API_BASE__ || "http://localhost:3001";
const DEFAULT_AVATAR = "../img/avatar.png";

/* STORAGE */
function getStoredAdmin() {
  try {
    return JSON.parse(localStorage.getItem("admin")) || null;
  } catch {
    return null;
  }
}
function setStoredAdmin(admin) {
  const current = getStoredAdmin() || {};
  const merged = { ...current, ...admin };
  localStorage.setItem("admin", JSON.stringify(merged));
  return merged;
}

/* AUTH HELPERS */
async function ensureAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    // sem token -> volta pro login
    window.location.href = "/frontend/login.html";
    return;
  }
  // tenta validar/atualizar dados do usuário
  try {
    const resp = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error("unauthorized");
    const me = await resp.json();
    // normaliza e guarda no storage
    setStoredAdmin({
      name: me.nome || me.name || "Administrador",
      email: me.email,
      vinculo: me.vinculo ?? "externo",
      picurl: getStoredAdmin()?.picurl || DEFAULT_AVATAR,
    });
  } catch {
    // token inválido/expirado
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    window.location.href = "/frontend/login.html";
  }
}

// Wrapper para chamadas autenticadas às suas rotas (trilhas, árvores, perguntas, etc.)
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401) {
    // sessão caiu -> limpa e volta pro login
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    window.location.href = "/frontend/login.html";
    throw new Error("Sessão expirada");
  }
  return resp;
}

/* TOPBAR */
function loadTopBar() {
  const user = getStoredAdmin() || {
    name: "Administrador",
    email: "—",
    picurl: DEFAULT_AVATAR,
    vinculo: "externo",
  };

  const img = document.getElementById("topbar-pic");
  const nameElem = document.getElementById("topbar-name");
  const emailElem = document.getElementById("topbar-email");

  if (img) img.src = user.picurl || DEFAULT_AVATAR;
  if (nameElem) nameElem.textContent = user.name || "";
  if (emailElem) emailElem.textContent = user.email || "";
}

/* SIDEBAR */
function loadSideBar() {
  const menuButtons = document.querySelectorAll(".menu-item");
  const pages = document.querySelectorAll(".page");

  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      menuButtons.forEach((b) => b.classList.toggle("active", b === btn));
      pages.forEach((p) => p.classList.toggle("visible", p.id === `page-${page}`));
    });
  });

  document.querySelectorAll(".menu-item").forEach((el) => {
    const labelNode = el.querySelector("span:not(.icon)");
    const label = (labelNode ? labelNode.textContent : el.textContent).trim();
    if (label) {
      el.setAttribute("title", label);
      el.setAttribute("aria-label", label);
    }
  });

  // Sair: limpa storage + redireciona
  const sairBtn = document.getElementById("sairBtn");
  if (sairBtn) {
    sairBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "/frontend/login.html";
    });
  }
}

/* PARTIALS */
async function loadPartials() {
  document.getElementById("sidebar").innerHTML = await (await fetch("../partials/sidebar.html")).text();
  document.getElementById("topbar").innerHTML = await (await fetch("../partials/topbar.html")).text();

  loadTopBar();
  loadSideBar();

  // marca item ativo no menu
  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll(".menu-item").forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.classList.add("active");
    }
  });
}

/* EXEMPLO: usando authFetch nas suas APIs protegidas
async function carregarTrilhas() {
  const resp = await authFetch(`${API_BASE}/api/trilhas`);
  const trilhas = await resp.json();
  console.log(trilhas);
}
*/

/* BOOT */
(async function initAdmin() {
  await ensureAuth();   // valida sessão e carrega user no storage
  await loadPartials(); // injeta topbar/sidebar e preenche user
  // await carregarTrilhas(); // exemplo de uso
})();
