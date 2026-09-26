module.exports = (sequelize, DataTypes) => {
  const ArvoreTrilha = sequelize.define('PontoInteresseTrilha', {
    trilha_nome: {
      type: DataTypes.STRING,
      primaryKey: true
    },
    ponto_interesse_codigo: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    ordem: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    tableName: 'ponto_interesse_trilha',
    schema: 'public',
    timestamps: false,
  });

  return ArvoreTrilha;
};