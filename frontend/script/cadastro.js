(function initCadastro() {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
  const form = document.querySelector(".formCadastro");
  if (!form) return;

  const token = new URLSearchParams(window.location.search).get("token");
  const emailInput = document.getElementById("signupEmail");
  const message = document.getElementById("invitationMessage");
  const errorBox = document.getElementById("signupError");
  const senhaInput = document.getElementById("signupSenha");
  const confirmInput = document.getElementById("confirmarSenha");
  const profileImage = document.getElementById("profileImage");
  const fileInput = document.getElementById("fileInput");
  form.hidden = true;

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("invitation-error", isError);
  }

  async function loadInvitation() {
    if (!token) {
      showMessage("Este convite não é válido. Solicite um novo convite a um superadministrador.", true);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/invitation?token=${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Convite inválido ou expirado.");
      emailInput.value = data.email;
      form.hidden = false;
      showMessage("Informe os dados para concluir o cadastro do seu perfil.");
    } catch (error) {
      showMessage(error.message || "Não foi possível validar o convite.", true);
    }
  }

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file || !profileImage) return;
    const reader = new FileReader();
    reader.onload = event => { profileImage.src = event.target.result; };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    errorBox.textContent = "";
    errorBox.style.display = "none";
    if (senhaInput.value !== confirmInput.value) {
      errorBox.textContent = "As senhas devem ser iguais.";
      errorBox.style.display = "block";
      confirmInput.focus();
      return;
    }

    const formData = new FormData();
    formData.append("token", token);
    formData.append("nome", document.getElementById("nome").value.trim());
    formData.append("senha", senhaInput.value);
    formData.append("vinculo", document.getElementById("vinculo").value);
    if (fileInput?.files?.[0]) formData.append("avatar", fileInput.files[0]);

    try {
      const response = await fetch(`${API_BASE}/api/auth/complete-invitation`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationError = data.errors?.[0]?.msg;
        throw new Error(validationError || data.error || "Não foi possível cadastrar o perfil.");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("admin", JSON.stringify({
        name: data.admin.nome,
        email: data.admin.email,
        vinculo: data.admin.vinculo,
        tipo: data.admin.tipo,
        picurl: "",
      }));
      window.location.href = "/pages/dashboard.html";
    } catch (error) {
      errorBox.textContent = error.message || "Erro inesperado no cadastro.";
      errorBox.style.display = "block";
    }
  });

  loadInvitation();
})();
