const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Arvore = sequelize.define('Arvore', {
    trilha_nome:  { type: DataTypes.STRING, primaryKey: true },
    codigo:       { type: DataTypes.INTEGER, primaryKey: true },
    nome:         { type: DataTypes.STRING, allowNull: false },
    especie:      { type: DataTypes.STRING },
    foto_url:     { type: DataTypes.TEXT },
    ativa:        { type: DataTypes.BOOLEAN, defaultValue: true },
    pos_x:        { type: DataTypes.DECIMAL(10,6), allowNull: true },
    pos_y:        { type: DataTypes.DECIMAL(10,6), allowNull: true },
    ordem:        { type: DataTypes.INTEGER, allowNull: true },
    
  }, {
    tableName: 'arvore',
    schema: 'public',
    timestamps: false
  });


  // PK composta (trilha_nome, codigo)
  Arvore.removeAttribute('id');
  Arvore.primaryKeyAttributes = ['trilha_nome','codigo'];
  Arvore.addHook('afterSync', async () => {}); // no-op só pra manter o meta

  return Arvore;
};
