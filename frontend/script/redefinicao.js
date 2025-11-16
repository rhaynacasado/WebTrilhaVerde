document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";

  const qs = new URLSearchParams(location.search);
  const resetToken = qs.get("token");

  // campos possíveis (suporte a 3 modos com o mesmo JS)
  const form = document.querySelector(".formPassword") || document.querySelector("form");
  const errorBox =
    document.getElementById("passwordError") ||
    document.getElementById("resetError") ||
    document.getElementById("forgotError");

  const emailInput        = document.getElementById("emailReset");     // modo esqueci
  const atualInput        = document.getElementById("passwordAtual");  // modo logado
  const novaInput         = document.getElementById("passwordNova") || document.getElementById("passwordSenha");
  const confirmaInput     = document.getElementById("passwordConfirma");
  
  const userName = document.querySelector(".passwordNome");
  const userImage = document.getElementById("profileImage");

  const showErr = (msg) => {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = "block";
    } else {
      alert(msg);
    }
  };
  const clearErr = () => { 
    if (errorBox) { 
      errorBox.textContent = ""; 
      errorBox.style.display = "none"; 
    } 
  };

  async function authFetch(url, options = {}) {
    const token = localStorage.getItem("token");
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const resp = await fetch(url, { ...options, headers });
    if (resp.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("admin");
      window.location.href = "../index.html";
      throw new Error("Sessão expirada");
    }
    return resp;
  }

// --- Função para decodificar token JWT sem verificar assinatura ---
  function decodeJWT(token) {
    try {
      const payload = token.split('.')[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  // --- Preencher nome e foto do usuário ---
  async function preencherUsuario(token) {
    try {
      if (!token) return;

      // Supondo que o backend tenha rota para pegar usuário pelo resetToken
      const resp = await fetch(`${API_BASE}/api/auth/user-from-reset?token=${token}`);
      if (!resp.ok) throw new Error("Não foi possível obter informações do usuário.");

      const user = await resp.json();
      if (userName) userName.textContent = user.nome || "Usuário";
      if (userImage && user.fotoUrl) userImage.src = user.fotoUrl || "../img/avatar.png";
    } catch (err) {
      alert(err.message || "Erro ao carregar dados do usuário.");
      console.warn("Erro ao preencher usuário:", err.message);
      if (userName) userName.textContent = "Usuário";
      if (userImage) userImage.src = "../img/avatar.png";
    }
  }

  preencherUsuario(resetToken);

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErr();

    try {
      // --- FLUXO 1: reset via link com ?token= ---
      if (resetToken) {
        const nova = (novaInput?.value || "").trim();
        const conf = (confirmaInput?.value || "").trim();

        // if (!nova || nova.length < 6) return showErr("A nova senha deve ter pelo menos 6 caracteres.");
        if (conf && conf !== nova)    return showErr("As senhas devem ser iguais.");

        const resp = await fetch(`${API_BASE}/api/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, novaSenha: nova }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || "Não foi possível redefinir a senha.");

        alert("Senha redefinida com sucesso! Faça login novamente.");
        window.location.href = "../index.html";
        return;
      }

      // --- FLUXO 2: usuário logado trocando senha ---
      if (localStorage.getItem("token") && atualInput) {
        const atual = (atualInput?.value || "").trim();
        const nova  = (novaInput?.value || "").trim();
        const conf  = (confirmaInput?.value || "").trim();

        if (!atual)                    return showErr("Informe sua senha atual.");
        if (!nova || nova.length < 6)  return showErr("A nova senha deve ter pelo menos 6 caracteres.");
        if (conf && conf !== nova)     return showErr("As senhas devem ser iguais.");

        const resp = await authFetch(`${API_BASE}/api/auth/change-password`, {
          method: "POST",
          body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }),
        });
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(data.error || "Não foi possível alterar a senha.");

        alert("Senha alterada com sucesso! Faça login novamente.");
        // por segurança: encerra sessão
        localStorage.removeItem("token");
        localStorage.removeItem("admin");
        window.location.href = "../index.html";
        return;
      }

      // --- FLUXO 3: esqueci a senha (solicitar e-mail) ---
      if (emailInput) {
        const email = (emailInput.value || "").trim();
        if (!email) return showErr("Informe o e-mail cadastrado.");

        const resp = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json().catch(() => ({}));
        // DEBUG ONLY:
        if (!resp.ok) throw new Error(data.error || "Não foi possível iniciar a redefinição.");

        // DEBUG ONLY:
        // Backend em dev pode devolver um link direto (resetUrl).
        if (data.resetUrl) {
          alert(`Link de redefinição (dev): ${data.resetUrl}`);
          window.location.href = data.resetUrl; // se quiser ir direto
        }

        // DEBUG ONLY:
        // alert("Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
        window.location.href = "../index.html";
        return;
      }


      // fallback (form simples com um único campo de senha)
      if (novaInput && !atualInput && !emailInput) {
        if (novaInput.value.length < 6) return showErr("A nova senha deve ter pelo menos 6 caracteres.");
        alert("Configure os campos necessários na página para suportar os fluxos de troca/reset.");
      }
    } catch (err) {
      showErr(err.message || "Erro inesperado.");
    }
  });
});
