// frontend/script/api.js
const API_BASE = window.__API_BASE__ || "http://200.144.255.186:3001";
async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`, { credentials: 'omit' });
  if (!r.ok) throw new Error(`GET ${path} ${r.status}`);
  return r.json();
}

async function apiJson(path, method, body) {
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'omit',
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${r.status}`);
  }
  return r.json();
}

async function apiUpload(path, fileFieldName, file) {
  const fd = new FormData();
  fd.append(fileFieldName, file);
  const r = await fetch(`${API_BASE}${path}`, { method: 'PUT', body: fd });
  if (!r.ok) throw new Error(`Upload ${path} ${r.status}`);
  return r.json();
}

export { API_BASE, apiGet, apiJson, apiUpload };
