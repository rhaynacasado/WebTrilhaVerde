document.addEventListener("DOMContentLoaded", () => {
  const formCadastro = document.querySelector(".formCadastro");
  const signupError = document.getElementById("signupError");

  if (formCadastro) {
    formCadastro.addEventListener("submit", (event) => {
      event.preventDefault();
      alert("Funcionalidade de cadastro ainda não implementada!");

      // Exemplo de validação:
      // const nome = document.getElementById("nome").value.trim();
      // const email = document.getElementById("signupEmail").value.trim();
      // const senha = document.getElementById("signupSenha").value.trim();
      // if (nome && email && senha) {
      //   signupError.style.display = "none";
      //   alert("Cadastro realizado!");
      //   window.location.href = "login.html";
      // } else {
      //   signupError.style.display = "block";
      // }
    });
  }
  
  // Trocar foto de perfil
  const fileInput = document.getElementById("fileInput");
  const profileImage = document.getElementById("profileImage");

  if (fileInput && profileImage) {
    fileInput.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => profileImage.src = e.target.result;
        reader.readAsDataURL(file);
      }
    });
  }
});
