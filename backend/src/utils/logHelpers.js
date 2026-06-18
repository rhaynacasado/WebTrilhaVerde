// backend/src/utils/logHelpers.js
const { sequelize } = require('../models');

async function logArvore(req, trilha_nome, arvore_codigo, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  let tname = trilha_nome;
  console.log(`[logArvore START] trilha_nome=${trilha_nome}, arvore_codigo=${arvore_codigo}, acao=${acao}`);
  try {
    if (!tname) {
      console.log(`[logArvore] trilha_nome is falsy, querying arvore_trilha for arvore_codigo=${arvore_codigo}`);
      const [rows] = await sequelize.query(
        `SELECT trilha_nome FROM arvore_trilha WHERE arvore_codigo = $1 LIMIT 1`,
        { bind: [Number(arvore_codigo)] }
      );
      console.log(`[logArvore] query result:`, rows);
      if (rows && rows[0] && rows[0].trilha_nome) tname = rows[0].trilha_nome;
      console.log(`[logArvore] resolved tname=${tname}`);
    }
  } catch (err) {
    console.warn('logArvore: falha ao resolver trilha_nome via arvore_trilha', err && err.message ? err.message : err);
  }
  console.log(`[logArvore INSERT] trilha_nome=${tname}, arvore_codigo=${arvore_codigo}`);
  await sequelize.query(
    `INSERT INTO alteracao_arvore (trilha_nome, arvore_codigo, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,NOW(),$4)`,
    { bind: [tname, Number(arvore_codigo), adminEmail, acao] }
  );
}

async function logPergunta(req, trilha_nome, arvore_codigo, pergunta_id, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  let tname = trilha_nome;
  console.log(`[logPergunta START] trilha_nome=${trilha_nome}, arvore_codigo=${arvore_codigo}, pergunta_id=${pergunta_id}, acao=${acao}`);
  try {
    if (!tname) {
      console.log(`[logPergunta] trilha_nome is falsy, querying arvore_trilha for arvore_codigo=${arvore_codigo}`);
      const [rows] = await sequelize.query(
        `SELECT trilha_nome FROM arvore_trilha WHERE arvore_codigo = $1 LIMIT 1`,
        { bind: [Number(arvore_codigo)] }
      );
      console.log(`[logPergunta] query result:`, rows);
      if (rows && rows[0] && rows[0].trilha_nome) tname = rows[0].trilha_nome;
      console.log(`[logPergunta] resolved tname=${tname}`);
    }
  } catch (err) {
    console.warn('logPergunta: falha ao resolver trilha_nome via arvore_trilha', err && err.message ? err.message : err);
  }
  console.log(`[logPergunta INSERT] trilha_nome=${tname}, arvore_codigo=${arvore_codigo}, pergunta_id=${pergunta_id}`);
  await sequelize.query(
    `INSERT INTO alteracao_pergunta (trilha_nome, arvore_codigo, pergunta_id, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,$4,NOW(),$5)`,
    { bind: [tname, Number(arvore_codigo), Number(pergunta_id), adminEmail, acao] }
  );
}

module.exports = { logArvore, logPergunta };
