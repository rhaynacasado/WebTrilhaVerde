// backend/src/models/index.js
const sequelize = require('../db');
const { DataTypes } = require('sequelize');

// ATENÇÃO: o nome do arquivo é sensível a maiúsculas/minúsculas no Linux.
// Ex.: se o arquivo chama "Pergunta.js", use './Pergunta' aqui.
const Trilha    = require('./Trilha')(sequelize, DataTypes);
const Arvore    = require('./Arvore')(sequelize, DataTypes);
const Pergunta  = require('./Pergunta')(sequelize, DataTypes);
const Administrador  = require('./Administrador')(sequelize, DataTypes);
const PasswordReset = require('./PasswordReset')(sequelize, DataTypes);
const AlteracaoArvore    = require('./AlteracaoArvore')(sequelize, DataTypes);
const AlteracaoPergunta  = require('./AlteracaoPergunta')(sequelize, DataTypes);

/**
 * Associações
 * Trilha(nome PK) 1—N Arvore(trilha_nome FK)
 */
Trilha.hasMany(Arvore, {
  foreignKey: 'trilha_nome',
  sourceKey:  'nome',
  as: 'arvores',
});
Arvore.belongsTo(Trilha, {
  foreignKey: 'trilha_nome',
  targetKey:  'nome',
  as: 'trilha',
});

/**
 * (Opcional) Associações convenientes entre Arvore e Pergunta.
 * Como a FK da Pergunta é composta (trilha_nome + arvore_codigo),
 * o Sequelize não dá suporte “nativo” a uma única associação composta.
 * Criamos duas associações sem constraints apenas para facilitar includes.
 */
Pergunta.belongsTo(Arvore, {
  foreignKey: 'trilha_nome',
  targetKey:  'trilha_nome',
  as: 'arvorePorTrilha',
  constraints: false,
});
Pergunta.belongsTo(Arvore, {
  foreignKey: 'arvore_codigo',
  targetKey:  'codigo',
  as: 'arvorePorCodigo',
  constraints: false,
});
Arvore.hasMany(Pergunta, {
  foreignKey: 'trilha_nome',
  sourceKey:  'trilha_nome',
  as: 'perguntasPorTrilha',
  constraints: false,
});
Arvore.hasMany(Pergunta, {
  foreignKey: 'arvore_codigo',
  sourceKey:  'codigo',
  as: 'perguntas',
  constraints: false,
});

module.exports = { sequelize, Trilha, Arvore, Pergunta, Administrador, PasswordReset, AlteracaoArvore, AlteracaoPergunta};
