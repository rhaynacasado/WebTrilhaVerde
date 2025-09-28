// backend/src/models/Usuario.js
module.exports = (sequelize, DataTypes) => {
  const Usuario = sequelize.define('Usuario', {
    nickname: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(255), // Ajustado para corresponder ao BD
      allowNull: false,
    },
    avatar_foto: {
      // Para 'bytea' no Postgres, o ideal é usar BLOB
      type: DataTypes.BLOB('long'), 
      allowNull: true,
    },
    idade: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ano_escolar: {
      type: DataTypes.STRING(50), // Ajustado para corresponder ao BD
      allowNull: true,
    },
    num_arvores_visitadas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // [NOVO] Adicione este campo para o MIME type
    foto_mime: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'usuario',
    timestamps: false,
    // underscored: true, // O Sequelize converte camelCase para snake_case por padrão, 
                         // então essa linha pode não ser necessária se os nomes dos campos baterem.
                         // Mas pode manter se preferir ser explícito.
  });
  return Usuario;
};