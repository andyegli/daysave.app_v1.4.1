const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Contact = sequelize.define('Contact', {
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
    name: { type: DataTypes.STRING },
    nickname: { type: DataTypes.STRING },
    organization: { type: DataTypes.STRING },
    job_title: { type: DataTypes.STRING },
    phones: { type: DataTypes.JSON },
    emails: { type: DataTypes.JSON },
    addresses: { type: DataTypes.JSON },
    social_profiles: { type: DataTypes.JSON },
    instant_messages: { type: DataTypes.JSON },
    urls: { type: DataTypes.JSON },
    dates: { type: DataTypes.JSON },
    notes: { type: DataTypes.JSON }
  }, {
    tableName: 'contacts',
    timestamps: true
  });
  return Contact;
}; 