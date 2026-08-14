module.exports = (sequelize, DataTypes) => {
  const Imagem = sequelize.define('Imagem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    arvore_codigo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    legenda: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fonte: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: 'imagens',
    timestamps: false,
  });

  return Imagem;
};
