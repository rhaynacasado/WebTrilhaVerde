// Carrega o HTML parcial da área esquerda (.left) e só então liga login/cadastro
document.addEventListener("DOMContentLoaded", () => {
  const leftSection = document.querySelector(".left");

  const runAllInits = () => {
    if (typeof window.inicializarComuns === "function") window.inicializarComuns();
    if (typeof window.initLogin === "function") window.initLogin();
    if (typeof window.initCadastro === "function") window.initCadastro();
  };

  if (!leftSection) return runAllInits();

  const partialUrl = window.location.pathname.includes("/pages/")
    ? "../partials/acesso.html"
    : "partials/acesso.html";

  fetch(partialUrl, { cache: "no-store" })
    .then((resp) => {
      if (!resp.ok) throw new Error("Falha ao carregar acesso.html");
      return resp.text();
    })
    .then((html) => {
      leftSection.innerHTML = html; // injeta o partial no bloco verde
      // Corrige URLs de imagens/parciais injetados para serem absolutos
      try {
        Array.from(leftSection.querySelectorAll('img')).forEach((img) => {
          const src = img.getAttribute('src') || '';
          try {
            img.src = new URL(src, document.baseURI).href;
          } catch (e) {
            // ignora se a URL for inválida
          }
        });
      } catch (e) {
        console.warn('Falha ao normalizar imagens do partial:', e?.message || e);
      }
      runAllInits();
    })
    .catch((err) => {
      console.error(err);
      leftSection.innerHTML = "<p>Erro ao carregar a área de acesso.</p>";
      runAllInits();
    });
});
