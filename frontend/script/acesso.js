// Carrega o HTML parcial da área esquerda (.left) e só então liga login/cadastro
document.addEventListener("DOMContentLoaded", () => {
  const leftSection = document.querySelector(".left");

  const runAllInits = () => {
    if (typeof window.inicializarComuns === "function") window.inicializarComuns();
    if (typeof window.initLogin === "function") window.initLogin();
    if (typeof window.initCadastro === "function") window.initCadastro();
  };

  if (!leftSection) return runAllInits();

  // Use caminho ABSOLUTO para funcionar em qualquer página
  fetch("/frontend/partials/acesso.html", { cache: "no-store" })
    .then((resp) => {
      if (!resp.ok) throw new Error("Falha ao carregar acesso.html");
      return resp.text();
    })
    .then((html) => {
      leftSection.innerHTML = html; // injeta o partial no bloco verde
      runAllInits();
    })
    .catch((err) => {
      console.error(err);
      leftSection.innerHTML = "<p>Erro ao carregar a área de acesso.</p>";
      runAllInits();
    });
});
