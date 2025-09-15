const user = getUser();

const profilePic = document.getElementById('profile-pic');
const inputNome = document.getElementById('inputNome');
const inputEmail = document.getElementById('inputEmail');
const inputVinculo = document.getElementById('inputVinculo');
const fileInput = document.getElementById('fileInput');
const editButton = document.querySelector('.edit-photo');
const saveButton = document.querySelector('.profile-actions .primary');

// Inicializa campos
profilePic.src = user.picurl;
inputNome.value = user.name;
inputEmail.value = user.email;
inputVinculo.value = user.vinculo;

document.getElementById('profileNome').textContent = userData.name;
document.getElementById('profileEmail').textContent = userData.email;

// --- Trocar foto ---
editButton.addEventListener('click', (e) => {
e.preventDefault();
fileInput.click();
});

fileInput.addEventListener('change', (e) => {
const file = e.target.files[0];
if (file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
    profilePic.src = evt.target.result;
    };
    reader.readAsDataURL(file);
}
});

// --- Salvar alterações ---
saveButton.addEventListener('click', (e) => {
e.preventDefault();

setUser({
    name: inputNome.value,
    email: inputEmail.value,
    vinculo: inputVinculo.value,
    picurl: profilePic.src
});

document.getElementById('profileNome').textContent = userData.name;
document.getElementById('profileEmail').textContent = userData.email;

// --- Atualiza topbar ---
const topbarPic = document.getElementById('topbar-pic');
const topbarName = document.getElementById('topbar-name');
const topbarEmail = document.getElementById('topbar-email');

if (topbarPic) topbarPic.src = userData.picurl;
if (topbarName) topbarName.textContent = userData.name;
if (topbarEmail) topbarEmail.textContent = userData.email;
});