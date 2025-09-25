// backend/src/models/pergunta.js
module.exports = (sequelize, DataTypes) => {
  const Pergunta = sequelize.define('Pergunta', {
    trilha_nome:    { type: DataTypes.STRING,  primaryKey: true },
    arvore_codigo:  { type: DataTypes.INTEGER, primaryKey: true },
    id:             { type: DataTypes.INTEGER, primaryKey: true },

    enunciado:      { type: DataTypes.TEXT },
    item_a:         { type: DataTypes.TEXT },
    item_b:         { type: DataTypes.TEXT },
    item_c:         { type: DataTypes.TEXT },
    item_d:         { type: DataTypes.TEXT },
    item_e:         { type: DataTypes.TEXT },

    texto:          { type: DataTypes.STRING },
    audio_url:      { type: DataTypes.STRING },

    resposta_correta:{ type: DataTypes.CHAR(1) },
    dica:           { type: DataTypes.STRING },
    audio_dica_url: { type: DataTypes.STRING },
  }, {
    tableName: 'pergunta', // Postgres baixa para minúsculas sem aspas
    schema: 'public',
    timestamps: false,
  });
  return Pergunta;
};
