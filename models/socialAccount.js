const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const SocialAccount = sequelize.define('SocialAccount', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    user_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    platform: {
      type: DataTypes.STRING,
      allowNull: false
    },
    handle: {
      type: DataTypes.STRING
    },
    provider_user_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    profile_data: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    refresh_token: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'social_accounts',
    timestamps: true
  });

  SocialAccount.associate = (models) => {
    SocialAccount.belongsTo(models.User, { foreignKey: 'user_id' });
    SocialAccount.hasMany(models.Content, { foreignKey: 'social_account_id' });
  };

  return SocialAccount;
}; 