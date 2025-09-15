const trilhas = [
{ nome: 'Árvores Úteis', árvores: 5, perguntas: 12 }
];

const trilhasList = document.getElementById('trilhasList');

trilhas.forEach(r => {
const el = document.createElement('div');
el.className = 'item';

const strong = document.createElement('strong');
strong.className = 'item-title';
strong.textContent = r.nome;
el.appendChild(strong);

const span = document.createElement('span');
span.className = 'meta';
span.textContent = `${r.árvores} árvores ativas • ${r.perguntas} perguntas`;
el.appendChild(span);

trilhasList.appendChild(el)
});