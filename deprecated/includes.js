// async function loadComponent(id, file) {
//   try {
//     const response = await fetch(file);
//     if (!response.ok) throw new Error(`Erro ao carregar ${file}`);
//     document.getElementById(id).innerHTML = await response.text();
//   } catch (err) {
//     console.error(err);
//   }
// }

// // Carregar os componentes
// window.addEventListener("DOMContentLoaded", () => {
//   loadComponent("menu", "components/menu.html");
//   loadComponent("header", "components/header.html");
//   loadComponent("footer", "components/footer.html");
// });
