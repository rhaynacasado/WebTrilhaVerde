// backend/src/utils/logHelpers.js
const { AlteracaoArvore, AlteracaoPergunta } = require('../models');

const actor = (req) => req?.user?.email || 'sistema@local';

async function logArvore(req, trilha_nome, arvore_codigo) {
  try {
    await AlteracaoArvore.create({
      trilha_nome,
      arvore_codigo,
      admin_email: actor(req),
      data_alteracao: new Date(),
    });
  } catch (e) {
    console.warn('Falha ao logar alteracao_arvore:', e.message);
  }
}

async function logPergunta(req, trilha_nome, arvore_codigo, pergunta_id) {
  try {
    await AlteracaoPergunta.create({
      trilha_nome,
      arvore_codigo,
      pergunta_id,
      admin_email: actor(req),
      data_alteracao: new Date(),
    });
  } catch (e) {
    console.warn('Falha ao logar alteracao_pergunta:', e.message);
  }
}

module.exports = { logArvore, logPergunta };
