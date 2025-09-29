// frontend/script/perfil.js
(function initPerfil() {
  const API_BASE = window.__API_BASE__ || "http://127.0.0.1:3001";

  function setSelectValue(selectEl, value) {
    if (!selectEl) return;
    if (value == null || value === "") { selectEl.selectedIndex = 0; return; }

    for (const opt of selectEl.options) {
      if (opt.value === value || opt.text.trim() === value) {
        selectEl.value = opt.value;
        return;
      }
    }

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
  const inputEmail = document.getElementById('inputEmail');
  const inputVinc  = document.getElementById('inputVinculo');
  const fileInput  = document.getElementById('fileInput');
  const editBtn    = document.querySelector('.edit-photo');
  const saveBtn    = document.querySelector('.profile-actions .primary');

  const token      = localStorage.getItem('token');

  // --- estado inicial ---
  const stored = JSON.parse(localStorage.getItem('admin') || '{}');
  if (profilePic && stored.picurl) profilePic.src = stored.picurl;
  if (inputNome)  inputNome.value  = stored.name  || '';
  if (inputEmail) inputEmail.value = stored.email || '';
  if (inputVinc)  setSelectValue(inputVinc, stored.vinculo);

  ensureFreshProfile().then(() => refreshAvatar());

  // abrir seletor de arquivo
  if (editBtn && fileInput) {
    editBtn.addEventListener('click', (e) => { e.preventDefault(); fileInput.click(); });
  }

  // recorte interativo
  if (fileInput && profilePic) {
    fileInput.addEventListener('change', (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const img = new Image();
    img.src = URL.createObjectURL(f);

    img.onload = () => {
      const modal = document.createElement('div');
      Object.assign(modal.style, {
        position: 'fixed', top:0,left:0,width:'100vw',height:'100vh',
        background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000
      });
      document.body.appendChild(modal);

      const container = document.createElement('div');
      Object.assign(container.style,{position:'relative',width:'400px',height:'400px',background:'#fff'});
      modal.appendChild(container);

      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 400;
      canvas.style.cursor = 'grab';
      container.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      let scale = Math.max(400/img.width, 400/img.height);
      let offsetX = (400 - img.width*scale)/2;
      let offsetY = (400 - img.height*scale)/2;
      let dragging=false, lastX=0,lastY=0;

      function clamp() {
        const w = img.width*scale, h = img.height*scale;
        if(w<=400) offsetX = (400-w)/2; else offsetX = Math.min(0, Math.max(400-w, offsetX));
        if(h<=400) offsetY = (400-h)/2; else offsetY = Math.min(0, Math.max(400-h, offsetY));
      }

      function draw() {
        ctx.clearRect(0,0,400,400);
        ctx.drawImage(img, offsetX, offsetY, img.width*scale, img.height*scale);
        ctx.strokeStyle = '#0f0'; ctx.lineWidth=2;
        ctx.strokeRect(0,0,400,400);
      }

      canvas.addEventListener('mousedown', e=>{dragging=true; lastX=e.clientX; lastY=e.clientY; canvas.style.cursor='grabbing';});
      window.addEventListener('mouseup', ()=>{dragging=false; canvas.style.cursor='grab';});
      window.addEventListener('mousemove', e=>{
        if(!dragging) return;
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        clamp(); draw();
      });

      canvas.addEventListener('wheel', e=>{
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const prevScale = scale;
        scale *= e.deltaY>0?0.95:1.05;
        scale = Math.max(Math.max(400/img.width, 400/img.height), Math.min(10,scale));

        offsetX -= (mx - offsetX)*(scale/prevScale -1);
        offsetY -= (my - offsetY)*(scale/prevScale -1);

        clamp(); draw();
      });

      const btnSave = document.createElement('button'); btnSave.textContent='Salvar'; btnSave.id='btnSaveAvatar';
      const btnCancel = document.createElement('button'); btnCancel.textContent='Cancelar'; btnCancel.id='btnCancelAvatar';
      btnSave.style.marginRight='10px';
      container.appendChild(btnSave); container.appendChild(btnCancel);

      function closeModal(){modal.remove();}
      btnCancel.addEventListener('click', closeModal);
      window.addEventListener('keydown', ev=>{if(ev.key==='Escape')closeModal();},{once:true});

      btnSave.addEventListener('click', async ()=>{
        const outCanvas = document.createElement('canvas');
        outCanvas.width = 256;
        outCanvas.height = 256;
        const outCtx = outCanvas.getContext('2d');

        // calcula recorte correspondente à área visível no canvas 400x400
        const sx = Math.max(0, -offsetX / scale);
        const sy = Math.max(0, -offsetY / scale);
        const sWidth = Math.min(img.width - sx, 400 / scale);
        const sHeight = Math.min(img.height - sy, 400 / scale);

        outCtx.drawImage(
          img,
          sx, sy, sWidth, sHeight, // origem na imagem
          0, 0, 256, 256           // destino no canvas de saída
        );

        outCanvas.toBlob(async blob=>{
          profilePic.src = URL.createObjectURL(blob);
          try{
            const fd = new FormData();
            fd.append('avatar', blob,'avatar.png');
            const resp = await fetch(`${API_BASE}/api/auth/me/avatar`,{
              method:'POST', headers:{Authorization:`Bearer ${token}`}, body:fd
            });
            if(!resp.ok) throw new Error('Erro ao salvar avatar');
            const a=JSON.parse(localStorage.getItem('admin')||'{}');
            a.picurl=profilePic.src;
            localStorage.setItem('admin',JSON.stringify(a));
          }
          finally{closeModal();}
        },'image/png');
      });

      draw();
    };
  });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        if (!token) throw new Error('Sessão expirada. Faça login.');

        const body = {};
        if (inputNome) body.nome = inputNome.value.trim();
        if (inputVinc) body.vinculo = inputVinc.value;

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

        await ensureFreshProfile();
        await refreshAvatar();
        alert('Perfil atualizado!');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao salvar perfil');
      }
    });
  }

  async function ensureFreshProfile() {
    try {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` }});
      if (!r.ok) return;
      const me = await r.json();

      const a = {
        name: me.nome,
        email: me.email,
        vinculo: me.vinculo,
        picurl: (JSON.parse(localStorage.getItem('admin') || '{}').picurl) || ''
      };
      localStorage.setItem('admin', JSON.stringify(a));

      if (inputNome)  inputNome.value  = a.name || '';
      if (inputEmail) inputEmail.value = a.email || '';
      if (inputVinc)  setSelectValue(inputVinc, a.vinculo);
    } catch {}
  }

  async function refreshAvatar() {
    try {
      if (!token) return;
      const r = await fetch(`${API_BASE}/api/auth/me/avatar`, { headers: { Authorization: `Bearer ${token}` }});
      if (r.ok && r.status !== 204) {
        const ct = r.headers.get('Content-Type') || 'image/jpeg';
        const buf = await r.arrayBuffer();
        const dataUrl = `data:${ct};base64,${arrayBufferToBase64(buf)}`;

        const a = JSON.parse(localStorage.getItem('admin') || '{}');
        a.picurl = dataUrl;
        localStorage.setItem('admin', JSON.stringify(a));

        if (profilePic) profilePic.src = dataUrl;

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
