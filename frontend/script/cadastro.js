// frontend/script/cadastro.js
(function initCadastro() {
  const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
  const form = document.querySelector(".formCadastro");
  if (!form) return;

  const nomeInput    = document.getElementById("nome")          || document.getElementById("inputNome");
  const emailInput   = document.getElementById("signupEmail")   || document.getElementById("inputEmail");
  const senhaInput   = document.getElementById("signupSenha")   || document.getElementById("passwordSenha");
  const vinculoInput = document.querySelector('#vinculo, #signupVinculo, #inputVinculo'); // << inclui #vinculo
  const fileInput    = document.getElementById("fileInput");
  const profileImage = document.getElementById("profileImage");

  // preview
  if (fileInput && profileImage) {
    fileInput.addEventListener("change", (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => (profileImage.src = ev.target.result);
      r.readAsDataURL(f);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome    = (nomeInput?.value || "").trim();
    const email   = (emailInput?.value || "").trim();
    const senha   = (senhaInput?.value || "").trim();
    const vinculo = (vinculoInput?.value || "").trim();

    if (!nome || !email || !senha) {
      alert("Preencha nome, e-mail e senha.");
      return;
    }

    try {
      // monta multipart (importante para enviar a foto binária)
      const fd = new FormData();
      fd.append("nome", nome);
      fd.append("email", email);
      fd.append("senha", senha);
      fd.append("vinculo", vinculo);
      if (fileInput?.files?.[0]) fd.append("avatar", fileInput.files[0]);

      const resp = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        body: fd, // NÃO defina Content-Type manualmente
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Falha no cadastro");

      const token = data.token;
      localStorage.setItem("token", token);
      localStorage.setItem(
        "admin",
        JSON.stringify({
          name: data.admin.nome,
          email: data.admin.email,
          vinculo: data.admin.vinculo,
          picurl: "", // vamos preencher abaixo
        })
      );

      await fetchAndCacheAvatarAsDataURL(API_BASE, token);
      window.location.assign("/pages/dashboard.html");
    } catch (err) {
      console.error(err);
      alert(err.message || "Erro inesperado no cadastro");
    }
  });

  async function fetchAndCacheAvatarAsDataURL(API_BASE, token) {
    try {
      const r = await fetch(`${API_BASE}/api/auth/me/avatar`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok || r.status === 204) return;
      const ct = r.headers.get("Content-Type") || "image/jpeg";
      const buf = await r.arrayBuffer();
      const b64 = arrayBufferToBase64(buf);
      const dataUrl = `data:${ct};base64,${b64}`;
      const a = JSON.parse(localStorage.getItem("admin") || "{}");
      a.picurl = dataUrl;
      localStorage.setItem("admin", JSON.stringify(a));
    } catch {}
  }
  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
})();
