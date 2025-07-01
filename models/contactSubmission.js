const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContactSubmission = sequelize.define('ContactSubmission', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true }
    },
    subject: {
      type: DataTypes.STRING
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    language: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'contact_submissions',
    timestamps: true
  });

  ContactSubmission.associate = (models) => {
    ContactSubmission.belongsTo(models.User, { foreignKey: 'user_id', allowNull: true });
  };

  return ContactSubmission;
}; 