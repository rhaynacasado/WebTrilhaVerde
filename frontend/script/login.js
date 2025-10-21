// Exponha uma função global que liga os eventos depois do partial ser injetado
window.initLogin = function initLogin() {
  const form = document.querySelector(".formLogin");
  if (!form) return;

  // Evita bind duplo se essa função for chamada mais de uma vez
  if (form.dataset.bound === "1") return;
  form.dataset.bound = "1";

  const loginEmail = document.getElementById("loginEmail");
  const loginSenha = document.getElementById("loginSenha");
  const loginError = document.getElementById("loginError");
  const forgotPasswordLink = document.getElementById("toPasswordFromLogin");

  // Esconde a mensagem de erro inicialmente
  if (loginError) {
    loginError.textContent = "";
    loginError.style.display = "none";
  }

  // Base da API — pode ser definida no HTML: window.__API_BASE__ = "http://127.0.0.1:3001";
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = (loginEmail?.value || "").trim();
    const senha = (loginSenha?.value || "").trim();

    if (!email || !senha) {
      showError("Informe e-mail e senha.");
      return;
    }

    try {
      const resp = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const msg =
          data?.errors?.[0]?.msg ||
          data?.error ||
          "Não foi possível fazer login.";
        throw new Error(msg);
      }

      // Guarda o JWT e dados básicos do admin
      localStorage.setItem("token", data.token);
      // guardamos também no formato que o resto do front usa
      localStorage.setItem(
        "admin",
        JSON.stringify({
          name: data.admin.nome,
          email: data.admin.email,
          vinculo: data.admin.vinculo,
          picurl: "", // preencheremos após baixar o avatar
        })
      );

      // Baixa avatar binário (BYTEA) e cacheia como data URL em admin.picurl
      await fetchAndCacheAvatarAsDataURL(API_BASE, data.token);

      // Redireciona para a área interna
      window.location.href = "/frontend/pages/dashboard.html";
    } catch (e) {
      console.error(e);
      showError(e.message || "Falha no login.");
    }
  });

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = "/frontend/pages/redefinicao.html";
    });
  }

  function showError(msg) {
    if (loginError) {
      loginError.textContent = msg;
      loginError.style.display = "block";
    } else {
      alert(msg);
    }
  }

  // ==== helpers para buscar avatar (BYTEA) e salvar como data URL ====

  async function fetchAndCacheAvatarAsDataURL(API_BASE, token) {
    try {
      const r = await fetch(`${API_BASE}/api/auth/me/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok || r.status === 204) return; // sem avatar cadastrado
      const ct = r.headers.get("Content-Type") || "image/jpeg";
      const buf = await r.arrayBuffer();
      const dataUrl = `data:${ct};base64,${arrayBufferToBase64(buf)}`;

      const a = JSON.parse(localStorage.getItem("admin") || "{}");
      a.picurl = dataUrl;
      localStorage.setItem("admin", JSON.stringify(a));
    } catch (err) {
      // silencioso: se falhar, seguimos sem avatar
      console.warn("Não foi possível carregar o avatar:", err?.message || err);
    }
  }

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
};
