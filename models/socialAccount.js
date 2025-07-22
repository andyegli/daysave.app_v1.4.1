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
      allowNull: false,
      comment: 'Social media platform (instagram, facebook, twitter, youtube, etc.)'
    },
    auth_type: {
      type: DataTypes.ENUM('oauth', 'credentials', 'hybrid'),
      allowNull: false,
      defaultValue: 'oauth',
      comment: 'Type of authentication: oauth for tokens, credentials for username/password, hybrid for both'
    },
    handle: {
      type: DataTypes.STRING,
      comment: 'User handle/username on the platform'
    },
    // OAuth fields
    provider_user_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Provider user ID for OAuth authentication'
    },
    profile_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Profile data from OAuth provider'
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OAuth access token'
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'OAuth refresh token'
    },
    // Credential-based fields
    username: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Username for credential-based authentication'
    },
    encrypted_password: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Encrypted password for credential-based authentication'
    },
    credential_metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for credential-based authentication (2FA settings, etc.)'
    },
    // Status and usage tracking
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when these credentials were last used for authentication'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired', 'invalid'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status of the social media account credentials'
    },
    usage_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times these credentials have been used'
    }
  }, {
    tableName: 'social_accounts',
    timestamps: true,
    indexes: [
      {
        name: 'idx_social_accounts_user_platform',
        fields: ['user_id', 'platform'],
        unique: false
      },
      {
        name: 'idx_social_accounts_platform',
        fields: ['platform']
      },
      {
        name: 'idx_social_accounts_auth_type',
        fields: ['auth_type']
      },
      {
        name: 'idx_social_accounts_status',
        fields: ['status']
      }
    ],
    validate: {
      // Ensure either OAuth or credentials are provided
      hasAuthenticationMethod() {
        if (this.auth_type === 'oauth' && !this.access_token) {
          throw new Error('OAuth accounts must have an access token');
        }
        if (this.auth_type === 'credentials' && (!this.username || !this.encrypted_password)) {
          throw new Error('Credential accounts must have username and password');
        }
        if (this.auth_type === 'hybrid' && !this.access_token && (!this.username || !this.encrypted_password)) {
          throw new Error('Hybrid accounts must have either OAuth tokens or credentials');
        }
      }
    }
  });

  SocialAccount.associate = (models) => {
    SocialAccount.belongsTo(models.User, { foreignKey: 'user_id' });
    SocialAccount.hasMany(models.Content, { foreignKey: 'social_account_id' });
  };

  return SocialAccount;
}; 