module.exports = (sequelize, DataTypes) => sequelize.define('AdministradorConvite', {
  email: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
    references: { model: 'administrador', key: 'email' },
    onDelete: 'CASCADE',
  },
  token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  expires_at: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'administrador_convite',
  schema: 'public',
  timestamps: false,
});
