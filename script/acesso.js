document.addEventListener("DOMContentLoaded", () => {
    // Formulários
    const formLogin = document.querySelector(".formLogin");
    const formCadastro = document.querySelector(".formCadastro");

    // Inputs de login
    const loginEmail = document.getElementById("loginEmail");
    const loginSenha = document.getElementById("loginSenha");
    const loginError = document.getElementById("loginError");

    // Inputs de cadastro
    const nomeInput = document.getElementById("nome");
    const signupEmail = document.getElementById("signupEmail");
    const signupSenha = document.getElementById("signupSenha");
    const vinculoInput = document.getElementById("vinculo");
    const signupError = document.getElementById("signupError");

    // Forms containers
    const loginFormContainer = document.getElementById("loginForm");
    const signupFormContainer = document.getElementById("signupForm");

    // Links para alternar entre os forms
    const toSignup = document.getElementById("toSignup");
    const toLogin = document.getElementById("toLogin");

    // -------- Evento de login --------
    if(formLogin){
        formLogin.addEventListener("submit", (event) => {
            event.preventDefault();

            const email = loginEmail.value.trim();
            const senha = loginSenha.value.trim();

            // Usuário válido (simulação)
            const usuarioValido = "admin";
            const senhaValida = "1234";

            if (email === usuarioValido && senha === senhaValida) {
                loginError.style.display = "none"; 
                window.location.href = "pages/dashboard.html"; // destino após login
            } else {
                loginError.style.display = "block";
            }
        });
    }

    // -------- Evento de cadastro --------
    if(formCadastro){
        formCadastro.addEventListener("submit", (event) => {
            event.preventDefault();

            const nome = nomeInput.value.trim();
            const email = signupEmail.value.trim();
            const senha = signupSenha.value.trim();
            const vinculo = vinculoInput.value.trim();

            // Validação simulada
            if (nome && email && senha) {
                signupError.style.display = "none";
                alert("Cadastro realizado com sucesso!");
                formCadastro.reset();
                signupFormContainer.classList.remove("active");
                loginFormContainer.classList.add("active");
            } else {
                signupError.style.display = "block";
            }
        });
    }

    // -------- Alternar para cadastro --------
    if(toSignup){
        toSignup.addEventListener("click", (event) => {
            event.preventDefault();
            loginFormContainer.classList.remove("active");
            signupFormContainer.classList.add("active");
        });
    }

    // -------- Alternar para login --------
    if(toLogin){
        toLogin.addEventListener("click", (event) => {
            event.preventDefault();
            signupFormContainer.classList.remove("active");
            loginFormContainer.classList.add("active");
        });
    }

    // -------- Esqueci a senha (simulação) --------
    const forgotPasswordLink = document.querySelector(".forgotpass a");
    if(forgotPasswordLink){
        forgotPasswordLink.addEventListener("click", (event) => {
            event.preventDefault();
            alert("Funcionalidade de redefinição de senha ainda não implementada!");
        });
    }

    // -------- Trocar foto de perfil --------
    const fileInput = document.getElementById("fileInput");
    const profileImage = document.getElementById("profileImage");

    if(fileInput && profileImage){
        fileInput.addEventListener("change", function(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileImage.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});
