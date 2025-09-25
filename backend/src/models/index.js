// backend/src/models/index.js
const sequelize = require('../db');
const { DataTypes } = require('sequelize');

const Trilha             = require('./Trilha')(sequelize, DataTypes);
const Arvore             = require('./Arvore')(sequelize, DataTypes);
const Pergunta           = require('./Pergunta')(sequelize, DataTypes);
const Administrador      = require('./Administrador')(sequelize, DataTypes);
const AlteracaoArvore    = require('./AlteracaoArvore')(sequelize, DataTypes);
const AlteracaoPergunta  = require('./AlteracaoPergunta')(sequelize, DataTypes);
const Usuario            = require('./Usuario')(sequelize, DataTypes);

/* ========= Associações =========
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

/* ========= Associações convenientes Arvore <-> Pergunta =========
 * FK composta (trilha_nome + arvore_codigo) → duas refs sem constraint
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

module.exports = {
  sequelize,
  Trilha,
  Arvore,
  Pergunta,
  Administrador,
  AlteracaoArvore,
  AlteracaoPergunta,
  Usuario,
};
