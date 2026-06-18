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
const Trofeu            = require('./Trofeu')(sequelize, DataTypes);
const ArvoreTrilha       = require('./ArvoreTrilha')(sequelize, DataTypes);

/* ========= Associações =========
 * Trilha(nome PK) N—N Arvore(código) via arvore_trilha
 */
Trilha.belongsToMany(Arvore, {
  through: ArvoreTrilha,
  foreignKey: 'trilha_nome',
  otherKey: 'arvore_codigo',
  as: 'arvores',
  timestamps: false,
});
Arvore.belongsToMany(Trilha, {
  through: ArvoreTrilha,
  foreignKey: 'arvore_codigo',
  otherKey: 'trilha_nome',
  as: 'trilhas',
  timestamps: false,
});

/* ========= Associações convenientes Arvore <-> Pergunta =========
 * FK composta (trilha_nome + arvore_codigo) → duas refs sem constraint
 */
Pergunta.belongsTo(Arvore, {
  foreignKey: 'arvore_codigo',
  targetKey:  'codigo',
  as: 'arvorePorCodigo',
  constraints: false,
});
Arvore.hasMany(Pergunta, {
  foreignKey: 'arvore_codigo',
  sourceKey:  'codigo',
  as: 'perguntas',
  constraints: false,
});

// Relação Troféu <-> Usuário
Usuario.hasMany(Trofeu, {
  foreignKey: 'usuario_nickname',
  sourceKey: 'nickname',
  as: 'trofeus'
});
Trofeu.belongsTo(Usuario, {
  foreignKey: 'usuario_nickname',
  targetKey: 'nickname',
  as: 'usuario'
});

// Relação Troféu <-> Árvore
// A chave estrangeira é composta, então definimos as duas partes
Arvore.hasMany(Trofeu, {
  foreignKey: 'arvore_codigo',
  sourceKey: 'codigo',
  as: 'trofeus',
  constraints: false
});
Trofeu.belongsTo(Arvore, {
  foreignKey: 'arvore_codigo',
  targetKey: 'codigo',
  as: 'Arvore', // O 'as' deve bater com o nome do modelo usado no include
  constraints: false
});

module.exports = {
  sequelize,
  Trilha,
  Arvore,
  ArvoreTrilha,
  Pergunta,
  Administrador,
  AlteracaoArvore,
  AlteracaoPergunta,
  Usuario,
  Trofeu
};
