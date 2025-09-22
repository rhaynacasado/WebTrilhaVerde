// backend/src/utils/logHelpers.js
const { sequelize } = require('../models');

async function logArvore(req, trilha_nome, arvore_codigo, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  await sequelize.query(
    `INSERT INTO alteracao_arvore (trilha_nome, arvore_codigo, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,NOW(),$4)`,
    { bind: [trilha_nome, Number(arvore_codigo), adminEmail, acao] }
  );
}

async function logPergunta(req, trilha_nome, arvore_codigo, pergunta_id, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  await sequelize.query(
    `INSERT INTO alteracao_pergunta (trilha_nome, arvore_codigo, pergunta_id, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,$4,NOW(),$5)`,
    { bind: [trilha_nome, Number(arvore_codigo), Number(pergunta_id), adminEmail, acao] }
  );
}

module.exports = { logArvore, logPergunta };
