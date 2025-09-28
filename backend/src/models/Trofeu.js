// backend/src/models/Trofeu.js
module.exports = (sequelize, DataTypes) => {
  const Trofeu = sequelize.define('Trofeu', {
    // As chaves primárias são definidas na associação
    usuario_nickname: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      references: {
        model: 'usuario',
        key: 'nickname'
      }
    },
    trilha_nome: {
      type: DataTypes.STRING(255),
      primaryKey: true,
      references: {
        model: 'arvore',
        key: 'trilha_nome'
      }
    },
    arvore_codigo: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'arvore',
        key: 'codigo'
      }
    }
  }, {
    tableName: 'trofeu',
    timestamps: false
  });

  Trofeu.associate = function(models) {
    // Relação: Um Troféu pertence a uma Árvore
    Trofeu.belongsTo(models.Arvore, { 
      foreignKey: 'arvore_codigo', 
      constraints: false 
    });

    // [NOVO] Relação: Um Troféu também pertence a um Usuário
    Trofeu.belongsTo(models.Usuario, {
      foreignKey: 'usuario_nickname',
      as: 'usuario' // Um apelido para a relação
    });
  };

  return Trofeu;
};