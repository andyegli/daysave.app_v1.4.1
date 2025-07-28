const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const UserPasskey = sequelize.define('UserPasskey', {
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
    credential_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Base64URL-encoded credential ID from WebAuthn'
    },
    credential_public_key: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Base64URL-encoded public key for credential verification'
    },
    credential_counter: {
      type: DataTypes.BIGINT,
      defaultValue: 0,
      comment: 'Signature counter for replay attack prevention'
    },
    device_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'User-friendly name for the device/authenticator',
      validate: {
        len: {
          args: [1, 100],
          msg: 'Device name must be between 1 and 100 characters'
        }
      }
    },
    device_type: {
      type: DataTypes.ENUM('phone', 'laptop', 'desktop', 'tablet', 'security_key', 'unknown'),
      defaultValue: 'unknown',
      comment: 'Type of device/authenticator used'
    },
    browser_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON string containing browser and platform information',
      get() {
        const value = this.getDataValue('browser_info');
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch (e) {
          return null;
        }
      },
      set(value) {
        if (value && typeof value === 'object') {
          this.setDataValue('browser_info', JSON.stringify(value));
        } else {
          this.setDataValue('browser_info', value);
        }
      }
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last successful authentication'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether this passkey is active and can be used for authentication'
    }
  }, {
    tableName: 'user_passkeys',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['credential_id'],
        unique: true
      },
      {
        fields: ['last_used_at']
      }
    ]
  });

  UserPasskey.associate = function(models) {
    // Each passkey belongs to a user
    UserPasskey.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE'
    });
  };

  // Instance methods
  UserPasskey.prototype.updateLastUsed = async function() {
    this.last_used_at = new Date();
    return this.save();
  };

  UserPasskey.prototype.deactivate = async function() {
    this.is_active = false;
    return this.save();
  };

  UserPasskey.prototype.activate = async function() {
    this.is_active = true;
    return this.save();
  };

  UserPasskey.prototype.getDeviceIcon = function() {
    const iconMap = {
      phone: 'bi-phone',
      laptop: 'bi-laptop',
      desktop: 'bi-pc-display',
      tablet: 'bi-tablet',
      security_key: 'bi-shield-check',
      unknown: 'bi-question-circle'
    };
    return iconMap[this.device_type] || iconMap.unknown;
  };

  UserPasskey.prototype.getDeviceDisplayName = function() {
    if (this.device_name) {
      return this.device_name;
    }
    
    const typeMap = {
      phone: 'Mobile Device',
      laptop: 'Laptop',
      desktop: 'Desktop Computer',
      tablet: 'Tablet',
      security_key: 'Security Key',
      unknown: 'Unknown Device'
    };
    return typeMap[this.device_type] || typeMap.unknown;
  };

  // Class methods
  UserPasskey.findByCredentialId = async function(credentialId) {
    return this.findOne({
      where: { credential_id: credentialId, is_active: true },
      include: [{
        model: sequelize.models.User,
        as: 'user'
      }]
    });
  };

  UserPasskey.getUserPasskeys = async function(userId, activeOnly = true) {
    const whereClause = { user_id: userId };
    if (activeOnly) {
      whereClause.is_active = true;
    }
    
    return this.findAll({
      where: whereClause,
      order: [['last_used_at', 'DESC'], ['created_at', 'DESC']]
    });
  };

  UserPasskey.countUserPasskeys = async function(userId, activeOnly = true) {
    const whereClause = { user_id: userId };
    if (activeOnly) {
      whereClause.is_active = true;
    }
    
    return this.count({ where: whereClause });
  };

  return UserPasskey;
}; 