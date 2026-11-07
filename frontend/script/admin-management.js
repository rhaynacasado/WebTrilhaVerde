(function initAdminManagement() {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
  const shell = document.querySelector(".app-shell");
  const accessError = document.getElementById("accessError");
  const form = document.getElementById("adminCreateForm");
  const rows = document.getElementById("adminRows");
  const message = document.getElementById("adminMessage");
  if (!shell || !form || !rows || !message) return;

  const currentEmail = (() => {
    try {
      return JSON.parse(localStorage.getItem("admin") || "{}").email?.toLowerCase();
    } catch {
      return "";
    }
  })();

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${localStorage.getItem("token") || ""}`);
    if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || data.errors?.[0]?.msg || "A operação não foi concluída.");
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  function renderAdmins(admins) {
    rows.replaceChildren();
    admins.forEach(admin => {
      const row = document.createElement("tr");
      const email = document.createElement("td");
      email.textContent = admin.email;
      const profile = document.createElement("td");
      profile.textContent = admin.perfilPendente
        ? (admin.conviteExpirado ? "Convite expirado" : "Aguardando cadastro")
        : (admin.nome || "Cadastrado");
      if (admin.perfilPendente) profile.className = "admin-status";
      const typeCell = document.createElement("td");
      const typeSelect = document.createElement("select");
      typeSelect.className = "admin-type-select";
      typeSelect.setAttribute("aria-label", `Tipo de ${admin.email}`);
      [
        ["padrao", "Padrão"],
        ["superadmin", "Superadmin"],
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        typeSelect.append(option);
      });
      typeSelect.value = admin.tipo;
      const isCurrentAdmin = admin.email.toLowerCase() === currentEmail;
      typeSelect.disabled = isCurrentAdmin;
      typeSelect.addEventListener("change", async () => {
        const previousType = admin.tipo;
        typeSelect.disabled = true;
        try {
          await request(`/api/admins/${encodeURIComponent(admin.email)}/tipo`, {
            method: "PUT",
            body: JSON.stringify({ tipo: typeSelect.value }),
          });
          admin.tipo = typeSelect.value;
          showMessage(`Tipo de ${admin.email} atualizado.`);
        } catch (error) {
          typeSelect.value = previousType;
          showMessage(error.message, true);
        } finally {
          typeSelect.disabled = isCurrentAdmin;
        }
      });
      typeCell.append(typeSelect);

      const actions = document.createElement("td");
      if (!isCurrentAdmin) {
        if (admin.perfilPendente) {
          const resendButton = document.createElement("button");
          resendButton.type = "button";
          resendButton.className = "admin-resend";
          resendButton.textContent = "Reenviar convite";
          resendButton.addEventListener("click", async () => {
            resendButton.disabled = true;
            try {
              const result = await request(`/api/admins/${encodeURIComponent(admin.email)}/invitation`, { method: "POST" });
              await loadAdmins();
              showMessage(result.message || "Convite reenviado por e-mail.");
            } catch (error) {
              showMessage(error.message, true);
              resendButton.disabled = false;
            }
          });
          actions.append(resendButton);
        }
        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "admin-remove";
        removeButton.textContent = "Remover";
        removeButton.addEventListener("click", async () => {
          if (!window.confirm(`Remover o administrador ${admin.email}?`)) return;
          removeButton.disabled = true;
          try {
            await request(`/api/admins/${encodeURIComponent(admin.email)}`, { method: "DELETE" });
            await loadAdmins();
            showMessage(`Administrador ${admin.email} removido.`);
          } catch (error) {
            showMessage(error.message, true);
            removeButton.disabled = false;
          }
        });
        actions.append(removeButton);
      } else {
        actions.textContent = "Conta atual";
      }

      row.append(email, profile, typeCell, actions);
      rows.append(row);
    });
  }

  async function loadAdmins() {
    const data = await request("/api/admins");
    renderAdmins(data.admins);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    showMessage("");
    try {
      const formData = new FormData(form);
      const data = await request("/api/admins", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          tipo: formData.get("tipo"),
        }),
      });
      form.reset();
      await loadAdmins();
      showMessage(data.message || "Convite enviado por e-mail.");
    } catch (error) {
      showMessage(error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  (async () => {
    try {
      await loadAdmins();
      shell.hidden = false;
    } catch (error) {
      if (error.status === 403) {
        window.location.replace("dashboard.html");
        return;
      }
      if (error.status === 401) return;
      accessError.textContent = error.message || "Não foi possível carregar a gestão de administradores.";
      accessError.hidden = false;
    }
  })();
})();
