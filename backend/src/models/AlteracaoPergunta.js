module.exports = (sequelize, DataTypes) => {
  const AlteracaoPergunta = sequelize.define('AlteracaoPergunta', {
    trilha_nome:   { type: DataTypes.STRING,  allowNull: false, primaryKey: true },
    arvore_codigo: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    pergunta_id:   { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    admin_email:   { type: DataTypes.STRING,  allowNull: false, primaryKey: true },
    data_alteracao:{ type: DataTypes.DATE,    allowNull: false, primaryKey: true, defaultValue: DataTypes.NOW },
  }, {
    tableName: 'alteracao_pergunta',
    timestamps: false,
  });

  return AlteracaoPergunta;
};
