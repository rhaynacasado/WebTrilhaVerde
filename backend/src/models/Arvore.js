const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Arvore = sequelize.define('Arvore', {
    codigo:       { type: DataTypes.INTEGER, primaryKey: true },
    nome:         { type: DataTypes.STRING, allowNull: false },
    especie:      { type: DataTypes.STRING },
    foto_url:     { type: DataTypes.TEXT },
    ativa:        { type: DataTypes.BOOLEAN, defaultValue: true },
    pos_x:        { type: DataTypes.DECIMAL(10,6), allowNull: true },
    pos_y:        { type: DataTypes.DECIMAL(10,6), allowNull: true },
    familia:      { type: DataTypes.STRING, allowNull: true },
    origem:       { type: DataTypes.STRING, allowNull: true },
    tipo_origem:  { type: DataTypes.STRING(50), allowNull: true },
    latitude:     { type: DataTypes.DECIMAL(12,8), allowNull: true },
    longitude:    { type: DataTypes.DECIMAL(12,8), allowNull: true },
    quantidade_perguntas: { type: DataTypes.INTEGER, defaultValue: 0 },
  }, {
    tableName: 'arvore',
    schema: 'public',
    timestamps: false,
    defaultScope: {
      attributes: { exclude: ['trilha_nome'] }
    }
  });

  // PK única no código da árvore
  Arvore.removeAttribute('id');
  Arvore.primaryKeyAttributes = ['codigo'];
  Arvore.addHook('afterSync', async () => {}); // no-op só pra manter o meta

  return Arvore;
};
