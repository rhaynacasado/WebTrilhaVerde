const logs = [
{ data: '2025-08-24 10:12', nome: 'Maria Silva', atividade: 'Editou uma árvore' },
{ data: '2025-08-24 09:02', nome: 'João Pedro', atividade: 'Criou uma pergunta' },
{ data: '2025-08-23 22:41', nome: 'Ana Júlia', atividade: 'Ativou uma árvore'},
{ data: '2025-08-23 20:15', nome: 'Miguel Rodrigues', atividade: 'Desativou uma árvore' }
];

const logBody = document.querySelector('#logTable tbody');

logs.forEach(l => {
const tr = document.createElement('tr');

const tdData = document.createElement('td');
tdData.textContent = l.data;
tr.appendChild(tdData);

const tdNome = document.createElement('td');
tdNome.textContent = l.nome;
tr.appendChild(tdNome);

const tdAtividade = document.createElement('td');
tdAtividade.textContent = l.atividade;
tr.appendChild(tdAtividade);

logBody.appendChild(tr);
});