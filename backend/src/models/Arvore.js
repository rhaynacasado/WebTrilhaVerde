const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const PontoInteresse = sequelize.define('PontoInteresse', {
    codigo:               { type: DataTypes.INTEGER, primaryKey: true },
    nome:                 { type: DataTypes.STRING, allowNull: false },
    tipo:                 { type: DataTypes.STRING(50), allowNull: false },
    qrcode_url:           { type: DataTypes.STRING(512), allowNull: false },
    especie:              { type: DataTypes.STRING, field: 'a_especie' },
    quantidade_perguntas: { type: DataTypes.INTEGER, defaultValue: 0 },
    ativa:                { type: DataTypes.BOOLEAN, defaultValue: true },
    familia:              { type: DataTypes.STRING, allowNull: true, field: 'a_familia' },
    origem:               { type: DataTypes.STRING, allowNull: true, field: 'a_origem' },
    tipo_origem:          { type: DataTypes.STRING(50), allowNull: true, field: 'a_tipo_origem' },
    p_descricao:          { type: DataTypes.TEXT, allowNull: true, field: 'p_desccricao' },
    p_construcao:         { type: DataTypes.TEXT, allowNull: true, field: 'p_construcao' },
    latitude:             { type: DataTypes.DECIMAL(12,8), allowNull: false },
    longitude:            { type: DataTypes.DECIMAL(12,8), allowNull: false },
  }, {
    tableName: 'ponto_interesse',
    schema: 'public',
    timestamps: false
  });

  PontoInteresse.removeAttribute('id');

  return PontoInteresse;
};