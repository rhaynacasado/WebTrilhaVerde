document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector(".form");
    const fileInput = document.getElementById('fileInput');
    const profileImage = document.getElementById('profileImage');
    const nomeInput = document.getElementById("nome");
    const emailInput = document.getElementById("email");
    const senhaInput = document.getElementById("senha");
    const errorMsg = document.getElementById("errorMsg");
    const loginLink = document.querySelector(".login");

    // Evento de login
    form.addEventListener("submit", (event) => {
        event.preventDefault(); // evita reload da página

        const nome = nomeInput.value.trim();
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

    fileInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
            profileImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });


    // Evento de criar conta
    loginLink.addEventListener("click", (event) => {
        event.preventDefault(); // evita comportamento padrão
        window.location.href = "login.html"; // redireciona
    });
});
