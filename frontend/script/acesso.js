document.addEventListener("DOMContentLoaded", () => {
  const leftSection = document.querySelector(".left");

  if (leftSection) {
    fetch("../partials/acesso.html")
      .then(resp => resp.text())
      .then(html => {
        leftSection.innerHTML = html;
        inicializarComuns();
      });
  } else {
    inicializarComuns();
  }
});
