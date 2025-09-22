// frontend/script/perfil.js
(function initPerfil() {
  const API_BASE = window.__API_BASE__ || "http://127.0.0.1:3001";

  // --- helpers ---
  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    if (value == null || value === "") { selectEl.selectedIndex = 0; return; }

    // 1) match direto por value ou texto
    for (const opt of selectEl.options) {
      if (opt.value === value || opt.text.trim() === value) {
        selectEl.value = opt.value;
        return;
      }
    }

    // 2) aliases (se BD guardar códigos)
    const alias = {
      aluno: "Aluno USP",
      prof: "Professor USP",
      professor: "Professor USP",
      funcionario: "Funcionário USP",
      servidor: "Funcionário USP",
      externo: "Externo",
      voluntario: "Voluntário",
      voluntário: "Voluntário",
    };
    const pretty = alias[String(value).toLowerCase()];
    if (pretty) {
      for (const opt of selectEl.options) {
        if (opt.value === pretty || opt.text.trim() === pretty) {
          selectEl.value = opt.value;
          return;
        }
      }
    }

    // 3) fallback: cria uma option com o valor do BD
    const o = new Option(value, value, true, true);
    selectEl.add(o, 0);
    selectEl.value = value;
  }

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  // --- DOM ---
  const profilePic = document.getElementById('profile-pic');
  const inputNome  = document.getElementById('inputNome');
  const inputEmail = document.getElementById('inputEmail'); // geralmente readonly
  const inputVinc  = document.getElementById('inputVinculo'); // <select>
  const fileInput  = document.getElementById('fileInput');
  const editBtn    = document.querySelector('.edit-photo');
  const saveBtn    = document.querySelector('.profile-actions .primary');

  // --- estado inicial (localStorage) ---
  const stored = JSON.parse(localStorage.getItem('admin') || '{}');
  const token  = localStorage.getItem('token');

  if (profilePic && stored.picurl) profilePic.src = stored.picurl;
  if (inputNome)  inputNome.value  = stored.name  || '';
  if (inputEmail) inputEmail.value = stored.email || '';
  if (inputVinc)  setSelectValue(inputVinc, stored.vinculo);   // <<< agora usa helper

  // busca estado atual do servidor
  ensureFreshProfile().then(() => refreshAvatar());

  // abrir seletor de arquivo
  if (editBtn && fileInput) {
    editBtn.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
  }

  // preview da foto escolhida
  if (fileInput && profilePic) {
    fileInput.addEventListener('change', (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => profilePic.src = ev.target.result;
      r.readAsDataURL(f);
    });
  }

  // salvar alterações
  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (!token) throw new Error('Sessão expirada. Faça login.');

        // 1) Atualiza nome/vínculo (JSON)
        const body = {};
        if (inputNome) body.nome = inputNome.value.trim();
        if (inputVinc) body.vinculo = inputVinc.value; // pega exatamente o value da option

        const up = await fetch(`${API_BASE}/api/auth/me`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || 'Falha ao atualizar perfil');

        // 2) Se escolheu nova foto, envia agora (multipart)
        if (fileInput?.files?.[0]) {
          const fd = new FormData();
          fd.append('avatar', fileInput.files[0]);
          const av = await fetch(`${API_BASE}/api/auth/me/avatar`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: fd
          });
          const avData = await av.json().catch(() => ({}));
          if (!av.ok) throw new Error(avData.error || 'Falha ao salvar foto');
        }

        // 3) Recarrega dados + avatar do servidor e atualiza storage/topbar
        await ensureFreshProfile();
        await refreshAvatar();
        alert('Perfil atualizado!');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao salvar perfil');
      }
    });
  }

  // --- funcs que sincronizam com o backend ---
  async function ensureFreshProfile() {
    try {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!r.ok) return;
      const me = await r.json();

      const a = {
        name:   me.nome,
        email:  me.email,
        vinculo: me.vinculo,
        picurl: (JSON.parse(localStorage.getItem('admin') || '{}').picurl) || ''
      };
      localStorage.setItem('admin', JSON.stringify(a));

      if (inputNome)  inputNome.value  = a.name || '';
      if (inputEmail) inputEmail.value = a.email || '';
      if (inputVinc)  setSelectValue(inputVinc, a.vinculo); // <<< garante select marcado
    } catch {}
  }

  async function refreshAvatar() {
    try {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/auth/me/avatar`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (r.ok && r.status !== 204) {
        const ct = r.headers.get('Content-Type') || 'image/jpeg';
        const buf = await r.arrayBuffer();
        const dataUrl = `data:${ct};base64,${arrayBufferToBase64(buf)}`;

        const a = JSON.parse(localStorage.getItem('admin') || '{}');
        a.picurl = dataUrl;
        localStorage.setItem('admin', JSON.stringify(a));

        if (profilePic) profilePic.src = dataUrl;

        // atualiza topbar
        const topPic  = document.getElementById('topbar-pic');
        const topName = document.getElementById('topbar-name');
        const topMail = document.getElementById('topbar-email');
        if (topPic)  topPic.src = dataUrl;
        if (topName) topName.textContent = a.name || '';
        if (topMail) topMail.textContent = a.email || '';
      }
    } catch {}
  }
})();
