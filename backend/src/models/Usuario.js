// backend/src/models/Usuario.js
module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    nickname: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    avatar_foto: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    idade: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ano_escolar: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    num_arvores_visitadas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    tableName: 'usuario',
    timestamps: false,
    underscored: true,
  });
  return Usuario;
};
