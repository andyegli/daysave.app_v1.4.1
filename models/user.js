const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role_id: {
      type: DataTypes.CHAR(36),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING
    },
    device_fingerprint: {
      type: DataTypes.STRING
    },
    subscription_status: {
      type: DataTypes.ENUM('free', 'trial', 'basic', 'pro'),
      defaultValue: 'trial'
    },
    // Last known location tracking
    last_login_country: {
      type: DataTypes.STRING(2),
      allowNull: true,
      comment: 'Last login country code'
    },
    last_login_city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Last login city'
    },
    location_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when location significantly changed'
    },
    language: {
      type: DataTypes.STRING,
      defaultValue: 'en'
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verification_token: {
      type: DataTypes.STRING,
      allowNull: true
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    totp_secret: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'TOTP secret for two-factor authentication'
    },
    totp_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether two-factor authentication is enabled'
    },
    totp_backup_codes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'JSON array of backup codes for 2FA recovery'
    },
    last_password_change: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp of last password change'
    },
    mfa_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether MFA is required by admin for this user'
    },
    mfa_enforced_by: {
      type: DataTypes.CHAR(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin user who enforced MFA requirement'
    },
    mfa_enforced_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'When MFA requirement was enforced'
    }
  }, {
    tableName: 'users',
    timestamps: true
  });

  User.associate = (models) => {
    User.belongsTo(models.Role, { foreignKey: 'role_id' });
    User.hasMany(models.UserDevice, { foreignKey: 'user_id' });
    User.hasMany(models.AuditLog, { foreignKey: 'user_id' });
    User.hasMany(models.SocialAccount, { foreignKey: 'user_id' });
    User.hasMany(models.Content, { foreignKey: 'user_id' });
    User.hasMany(models.File, { foreignKey: 'user_id' });
    User.hasMany(models.Contact, { foreignKey: 'user_id' });
    User.hasMany(models.ContactGroup, { foreignKey: 'user_id' });
    User.hasMany(models.Relationship, { foreignKey: 'user_id' });
    User.hasMany(models.ContactRelation, { foreignKey: 'user_id' });
    User.hasMany(models.ContentGroup, { foreignKey: 'user_id' });
    User.hasMany(models.ContentRelation, { foreignKey: 'user_id' });
    User.hasMany(models.ShareLog, { foreignKey: 'user_id' });
    User.hasMany(models.LoginAttempt, { foreignKey: 'user_id' });
    User.hasMany(models.ContactSubmission, { foreignKey: 'user_id', allowNull: true });
    User.hasMany(models.AdminSetting, { foreignKey: 'user_id' });
    
    // MFA enforcement association
    User.belongsTo(models.User, { foreignKey: 'mfa_enforced_by', as: 'MfaEnforcedByAdmin' });
    
    // Subscription associations
    User.hasMany(models.UserSubscription, { foreignKey: 'user_id', as: 'UserSubscriptions' });
    
    // Multimedia analysis associations
    User.hasMany(models.Speaker, { foreignKey: 'user_id', as: 'speakers' });
    User.hasMany(models.Thumbnail, { foreignKey: 'user_id', as: 'thumbnails' });
    User.hasMany(models.OCRCaption, { foreignKey: 'user_id', as: 'ocrCaptions' });
    User.hasMany(models.VideoAnalysis, { foreignKey: 'user_id', as: 'videoAnalyses' });
    User.hasMany(models.AudioAnalysis, { foreignKey: 'user_id', as: 'audioAnalyses' });
    User.hasMany(models.ImageAnalysis, { foreignKey: 'user_id', as: 'imageAnalyses' });
    User.hasMany(models.ProcessingJob, { foreignKey: 'user_id', as: 'processingJobs' });
  };

  return User;
}; 