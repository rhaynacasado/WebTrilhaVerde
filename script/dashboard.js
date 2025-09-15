// -------- KPIs de exemplo --------
const kpis = {
usuarios: { total: 120, delta: '+7 vs semana passada' },
trilhas: { total: 1, delta: '+4 vs semana passada' },
arvores: { total: 80, delta: '+5 vs semana passada' },
perguntas: { total: 28, delta: '+3 vs semana passada' }
};
document.getElementById('kpiUsuarios').textContent = kpis.usuarios.total;
document.getElementById('kpiUsuariosDelta').textContent = kpis.usuarios.delta;
document.getElementById('kpiTrilhas').textContent = kpis.trilhas.total;
document.getElementById('kpiTrilhasDelta').textContent = kpis.trilhas.delta;
document.getElementById('kpiArvores').textContent = kpis.arvores.total;
document.getElementById('kpiArvoresDelta').textContent = kpis.arvores.delta;
document.getElementById('kpiPerguntas').textContent = kpis.perguntas.total;
document.getElementById('kpiPerguntasDelta').textContent = kpis.perguntas.delta;

// -------- Donut de progresso --------
function setDonut(percent){
const r = 52;
const circ = 2 * Math.PI * r;
const dash = `${(percent/100)*circ} ${circ}`;
document.querySelector('.donut-indicator').setAttribute('stroke-dasharray', dash);
document.getElementById('donutLabel').textContent = `${percent}%`;
}
setDonut(41);

// -------- Barras semanais --------
const semana = [24, 36, 52, 70, 48, 30, 58]; // dados fictícios
const barsWrap = document.getElementById('bars');
semana.forEach(v => {
const bar = document.createElement('div');
bar.className = 'bar';
const fill = document.createElement('i');
fill.style.height = Math.min(100, Math.max(0, v)) + '%';
bar.appendChild(fill);
barsWrap.appendChild(bar);
});

// -------- Atividades Recentes --------
const atividades = [
{ quem: 'Maria Silva', acao: 'Editou uma árvore', quando: 'Hoje' },
{ quem: 'João Pedro', acao: 'Criou uma pergunta', quando: 'Ontem' },
{ quem: 'Ana Júlia', acao: 'Ativou uma árvore', quando: '2 dias atrás' }
];

const activityList = document.getElementById('activityList');

atividades.forEach(a => {
const li = document.createElement('li');

// div.who
const divWho = document.createElement('div');
divWho.classList.add('who');

// badge
const badge = document.createElement('span');
badge.classList.add('badge');
badge.textContent = '🙂';

// container do nome + ação
const divText = document.createElement('div');

const strong = document.createElement('strong');
strong.textContent = a.quem;

const br = document.createElement('br');

const spanAcao = document.createElement('span');
spanAcao.classList.add('acao');
spanAcao.textContent = a.acao;

divText.appendChild(strong);
divText.appendChild(br);
divText.appendChild(spanAcao);

divWho.appendChild(badge);
divWho.appendChild(divText);

// span.time
const spanTime = document.createElement('span');
spanTime.classList.add('time');
spanTime.textContent = a.quando;

// monta no li
li.appendChild(divWho);
li.appendChild(spanTime);

activityList.appendChild(li);
});