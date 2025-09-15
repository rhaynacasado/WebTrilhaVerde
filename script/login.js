document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.querySelector(".formLogin");
  const loginEmail = document.getElementById("loginEmail");
  const loginSenha = document.getElementById("loginSenha");
  const loginError = document.getElementById("loginError");
  const forgotPasswordLink = document.getElementById("toPasswordFromLogin");

  if (loginError) loginError.style.display = "none";

  if (formLogin) {
    formLogin.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = loginEmail.value.trim();
      const senha = loginSenha.value.trim();

      const usuarioValido = "admin";
      const senhaValida = "1234";

      if (email === usuarioValido && senha === senhaValida) {
        loginError.style.display = "none";
        window.location.href = "pages/dashboard.html";
      } else {
        loginError.style.display = "block";
      }
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (event) => {
      event.preventDefault();
      alert("Redirecionando para a página de redefinição de senha.");
      window.location.href = "redefinicao.html";
    });
  }
});
