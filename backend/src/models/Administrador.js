const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Administrador', {
    email:  { type: DataTypes.STRING, primaryKey: true, validate: { isEmail: true } },
    senha:  { type: DataTypes.STRING, allowNull: false }, // hash bcrypt
    nome:   { type: DataTypes.STRING, allowNull: false },
    vinculo:{ type: DataTypes.STRING },
  }, { tableName: 'Administrador', timestamps: false });
};
