// Define a API base automatically by environment.
(function setApiBase() {
  if (window.__API_BASE__) return;

  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1" || host === "::1";

  window.__API_BASE__ = isLocalHost
    ? "http://127.0.0.1:3001"
    : "http://200.144.255.186:3001";
})();
