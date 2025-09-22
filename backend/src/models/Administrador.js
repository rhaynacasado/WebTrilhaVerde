const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const Administrador = sequelize.define('Administrador', {
    email:    { type: DataTypes.STRING, primaryKey: true, allowNull: false, validate:{ isEmail:true } },
    senha:    { type: DataTypes.STRING, allowNull: false },
    nome:     { type: DataTypes.STRING, allowNull: false },
    vinculo:  { type: DataTypes.STRING },
    foto:     { type: DataTypes.BLOB('long'), allowNull: true }, // BYTEA
    foto_mime:{ type: DataTypes.TEXT,        allowNull: true },
  }, {
    tableName: 'administrador',  // minúsculo p/ bater com sua tabela
    timestamps: false,
    hooks: {
      async beforeCreate(a) { if (a.senha) a.senha = await bcrypt.hash(a.senha, 10); },
      async beforeUpdate(a) { if (a.changed('senha')) a.senha = await bcrypt.hash(a.senha, 10); },
    },
  });

  Administrador.prototype.checkPassword = function (senhaPlano) {
    return bcrypt.compare(senhaPlano, this.senha);
  };

  return Administrador;
};
