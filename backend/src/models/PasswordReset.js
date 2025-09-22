module.exports = (sequelize, DataTypes) => {
  const PasswordReset = sequelize.define('PasswordReset', {
    token_hash: {
      type: DataTypes.STRING(64), // sha256 hex
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'PasswordReset',
    timestamps: false,
    indexes: [{ fields: ['email'] }, { fields: ['expires_at'] }],
  });

  return PasswordReset;
};
