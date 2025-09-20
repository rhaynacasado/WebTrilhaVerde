const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Arvore = sequelize.define('Arvore', {
    codigo: { type: DataTypes.INTEGER, allowNull: false },
    trilha_nome: { type: DataTypes.STRING(255), allowNull: true },
    nome: { type: DataTypes.STRING(255), allowNull: false },
    especie: { type: DataTypes.STRING(255) },
    foto_url: { type: DataTypes.STRING(255) },
    quantidade_perguntas: { type: DataTypes.INTEGER, defaultValue: 0 },
    pos_x: { type: DataTypes.DECIMAL(10,6) },
    pos_y: { type: DataTypes.DECIMAL(10,6) },
    ativa: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    tableName: 'arvore',
    timestamps: false
  });

  // PK composta (trilha_nome, codigo)
  Arvore.removeAttribute('id');
  Arvore.primaryKeyAttributes = ['trilha_nome','codigo'];
  Arvore.addHook('afterSync', async () => {}); // no-op só pra manter o meta

  return Arvore;
};
