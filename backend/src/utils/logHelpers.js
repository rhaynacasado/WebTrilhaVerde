// backend/src/utils/logHelpers.js
const { sequelize } = require('../models');

async function logArvore(req, trilha_nome, ponto_interesse_codigo, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  let tname = trilha_nome;
  console.log(`[logArvore START] trilha_nome=${trilha_nome}, ponto_interesse_codigo=${ponto_interesse_codigo}, acao=${acao}`);
  try {
    if (!tname) {
      console.log(`[logArvore] trilha_nome is falsy, querying ponto_interesse_trilha for ponto_interesse_codigo=${ponto_interesse_codigo}`);
      const [rows] = await sequelize.query(
        `SELECT trilha_nome FROM ponto_interesse_trilha WHERE ponto_interesse_codigo = $1 LIMIT 1`,
        { bind: [Number(ponto_interesse_codigo)] }
      );
      console.log(`[logArvore] query result:`, rows);
      if (rows && rows[0] && rows[0].trilha_nome) tname = rows[0].trilha_nome;
      console.log(`[logArvore] resolved tname=${tname}`);
    }
  } catch (err) {
    console.warn('logArvore: falha ao resolver trilha_nome via ponto_interesse_trilha', err && err.message ? err.message : err);
  }
  console.log(`[logArvore INSERT] trilha_nome=${tname}, ponto_interesse_codigo=${ponto_interesse_codigo}`);
  await sequelize.query(
    `INSERT INTO alteracao_ponto_interesse (trilha_nome, ponto_interesse_codigo, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,NOW(),$4)`,
    { bind: [tname, Number(ponto_interesse_codigo), adminEmail, acao] }
  );
}

async function logPergunta(req, trilha_nome, ponto_interesse_codigo, pergunta_id, acao = 'update') {
  const adminEmail = req.user?.email || 'anon@local';
  let tname = trilha_nome;
  console.log(`[logPergunta START] trilha_nome=${trilha_nome}, ponto_interesse_codigo=${ponto_interesse_codigo}, pergunta_id=${pergunta_id}, acao=${acao}`);
  try {
    if (!tname) {
      console.log(`[logPergunta] trilha_nome is falsy, querying ponto_interesse_trilha for ponto_interesse_codigo=${ponto_interesse_codigo}`);
      const [rows] = await sequelize.query(
        `SELECT trilha_nome FROM ponto_interesse_trilha WHERE ponto_interesse_codigo = $1 LIMIT 1`,
        { bind: [Number(ponto_interesse_codigo)] }
      );
      console.log(`[logPergunta] query result:`, rows);
      if (rows && rows[0] && rows[0].trilha_nome) tname = rows[0].trilha_nome;
      console.log(`[logPergunta] resolved tname=${tname}`);
    }
  } catch (err) {
    console.warn('logPergunta: falha ao resolver trilha_nome via ponto_interesse_trilha', err && err.message ? err.message : err);
  }
  console.log(`[logPergunta INSERT] trilha_nome=${tname}, ponto_interesse_codigo=${ponto_interesse_codigo}, pergunta_id=${pergunta_id}`);
  await sequelize.query(
    `INSERT INTO alteracao_pergunta (trilha_nome, ponto_interesse_codigo, pergunta_id, admin_email, data_alteracao, acao)
     VALUES ($1,$2,$3,$4,NOW(),$5)`,
    { bind: [tname, Number(ponto_interesse_codigo), Number(pergunta_id), adminEmail, acao] }
  );
}

module.exports = { logArvore, logPergunta };
