document.addEventListener("DOMContentLoaded", () => {
  const formPassword = document.querySelector(".formPassword");
  const passwordInput = document.getElementById("passwordSenha");
  const passwordError = document.getElementById("passwordError");

  if (formPassword) {
    formPassword.addEventListener("submit", (event) => {
      event.preventDefault();
      
      // Exemplo de validação: senha mínima de 6 caracteres
      if (!passwordInput.value || passwordInput.value.length < 6) {
        passwordError.style.display = "block";
      } else {
        passwordError.style.display = "none";
        alert("Senha alterada com sucesso!");
        // Aqui você pode colocar sua função real de envio
      }
    });
  }
});
