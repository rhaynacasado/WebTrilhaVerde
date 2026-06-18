module.exports = (sequelize, DataTypes) => {
  const ArvoreTrilha = sequelize.define('ArvoreTrilha', {
    trilha_nome: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    arvore_codigo: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    ordem: {
      type: DataTypes.INTEGER,
      primaryKey: true
    }
  }, {
    tableName: 'arvore_trilha',
    schema: 'public',
    timestamps: false,
  });

  return ArvoreTrilha;
};