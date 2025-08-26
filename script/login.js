document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".form");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const errorMsg = document.getElementById("errorMsg");
    const createAccountLink = document.querySelector(".signup");
    const forgotPasswordLink = document.querySelector(".forgotpass a");

    // Evento de login
    form.addEventListener("submit", (event) => {
        event.preventDefault(); // evita reload da página

        const email = emailInput.value.trim();
        const senha = senhaInput.value.trim();

        // Usuário válido (simulação)
        const usuarioValido = "admin";
        const senhaValida = "1234";

        if (email === usuarioValido && senha === senhaValida) {
            errorMsg.style.display = "none"; 
            window.location.href = "dashboard-full.html"; // destino após login
        } else {
            errorMsg.style.display = "block";
        }
    });

    // Evento de criar conta
    createAccountLink.addEventListener("click", (event) => {
        event.preventDefault(); // evita comportamento padrão
        window.location.href = "signup.html"; // redireciona
    });

    // Evento de esqueci a senha
    forgotPasswordLink.addEventListener("click", (event) => {
        event.preventDefault(); // evita comportamento padrão
        window.location.href = "pages/dashboard.html"; // redireciona
    });
});
