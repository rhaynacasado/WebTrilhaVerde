const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Trilha = sequelize.define('Trilha', {
    nome: {
      type: DataTypes.STRING(255),
      primaryKey: true
    }
  }, {
    tableName: 'trilha',
    schema: 'public',
    timestamps: false
  });

  return Trilha;
};
