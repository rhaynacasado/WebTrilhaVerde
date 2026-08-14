// Define a API base automatically by environment.
(function setApiBase() {
  if (window.__API_BASE__) return;

  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  window.__API_BASE__ = isLocalHost
    ? "http://127.0.0.1:3001"
    : "http://200.144.255.186:3001";
})();

// Chave opcional da API do Google Maps (deixe vazia e configure conforme necessário).
// Ex.: window.__GOOGLE_MAPS_API_KEY__ = 'SUA_CHAVE_AQUI';
// Defina a chave da API do Google Maps fornecida pelo usuário.
window.__GOOGLE_MAPS_API_KEY__ = 'AIzaSyCHa_2B4d0rGc3Nx4T7ma6ZgvVn9PwTEZQ';
