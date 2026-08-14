document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";

  // Debug: log a URL e params capturados
  console.log("Página carregada com URL:", window.location.href);
  console.log("Search string:", window.location.search);

  const qs = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));

  let resetToken = qs.get("token") || qs.get("resetToken") || qs.get("t") || hashParams.get("token") || hashParams.get("resetToken") || hashParams.get("t");

  // Se não houver token na URL, tente recuperar do sessionStorage ou localStorage
  if (!resetToken) {
    resetToken = sessionStorage.getItem("resetToken") || localStorage.getItem("resetToken");
    console.log("Token recuperado do sessionStorage/localStorage:", resetToken ? resetToken.substring(0, 8) + "..." : "nenhum");
  } else {
    // Se token vem da URL, armazene no sessionStorage e no localStorage para facilitar a volta
    sessionStorage.setItem("resetToken", resetToken);
    localStorage.setItem("resetToken", resetToken);
    console.log("Token armazenado no sessionStorage/localStorage");
  }

  const isResetMode = Boolean(resetToken || qs.get("mode") === "reset" || hashParams.get("mode") === "reset");
  console.log("Token capturado/recuperado:", resetToken ? resetToken.substring(0, 8) + "..." : "nenhum");
  console.log("Modo de reset identificado:", isResetMode);

  // campos possíveis (suporte a 3 modos com o mesmo JS)
  const form = document.querySelector(".formPassword") || document.querySelector(".formEsqueci") || document.querySelector("form");
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

  console.log("Campos detectados - form:", !!form, "emailInput:", !!emailInput, "atualInput:", !!atualInput, "novaInput:", !!novaInput);

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
      if (!token) {
        console.warn("Token não fornecido para preencherUsuario");
        showErr("Token de redefinição não encontrado. Por favor, clique no link do e-mail novamente.");
        return false;
      }

      console.log("Buscando dados do usuário com token:", token.substring(0, 8) + "...");
      const resp = await fetch(`${API_BASE}/api/auth/user-from-reset?token=${token}`);
      console.log("Resposta do servidor:", resp.status, resp.statusText);
      
      if (!resp.ok) {
        const error = await resp.json().catch(() => ({}));
        const msg = error.error || "Não foi possível obter informações do usuário.";
        console.error("Erro:", msg);
        showErr(msg);
        return false;
      }

      const user = await resp.json();
      console.log("Usuário recebido:", user);
      
      if (userName) {
        userName.textContent = user.nome || "Usuário";
        console.log("Nome atualizado:", user.nome);
      }
      if (userImage) {
        const fallbackAvatar = "../img/avatar.png";
        const fotoUrl = user.fotoUrl || fallbackAvatar;
        userImage.src = fotoUrl;
        userImage.onerror = () => {
          userImage.src = fallbackAvatar;
          userImage.onerror = null;
        };
        console.log("Foto atualizada");
      }
      return true;
    } catch (err) {
      console.error("Erro ao preencher usuário:", err.message);
      showErr(err.message);
      if (userName) userName.textContent = "Usuário";
      if (userImage) {
        userImage.src = "../img/avatar.png";
        userImage.onerror = null;
      }
      return false;
    }
  }

  // Sempre tenta preencher usuário quando há token
  if (resetToken) {
    preencherUsuario(resetToken).catch(() => {});
  } else {
    console.warn("Nenhum token de reset encontrado na URL ou sessionStorage");
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearErr();

    console.log("Formulário submetido. resetToken:", resetToken, "loggedIn:", !!localStorage.getItem("token"), "emailInput-value:", emailInput?.value);

    try {
      // --- FLUXO 1: reset via link com token ---
      if (isResetMode && resetToken) {
        console.log("Entrando em FLUXO 1: reset via token");
        const nova = (novaInput?.value || "").trim();
        const conf = (confirmaInput?.value || "").trim();

        // if (!nova || nova.length < 6) return showErr("A nova senha deve ter pelo menos 6 caracteres.");
        if (conf && conf !== nova)    return showErr("As senhas devem ser iguais.");

        if (!nova || nova.length < 6) return showErr("A nova senha deve ter pelo menos 6 caracteres.");

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
        if (!resp.ok) throw new Error(data.error || "Não foi possível iniciar a redefinição.");

        // if (data.resetUrl) {
        //   alert("Solicitação recebida. Em modo de desenvolvimento, você será direcionado para a página de redefinição.");
        //   window.location.href = data.resetUrl;
        //   return;
        // }

        alert("Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.");
        window.location.href = "../index.html";
        return;
      }


      // fallback (form simples com um único campo de senha)
      if (novaInput && !resetToken && !localStorage.getItem("token") && !emailInput) {
        if (novaInput.value.length < 6) return showErr("A nova senha deve ter pelo menos 6 caracteres.");
        return showErr("Nenhum modo de redefinição identificado. Verifique a URL ou faça login antes.");
      }

      console.warn("Nenhum fluxo foi acionado. resetToken:", resetToken, "loggedIn:", !!localStorage.getItem("token"), "emailInput:", !!emailInput);
      return showErr("Erro inesperado ao processar a solicitação.");
    } catch (err) {
      showErr(err.message || "Erro inesperado.");
    }
  });
});
