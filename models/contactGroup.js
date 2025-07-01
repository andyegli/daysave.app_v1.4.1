const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContactGroup = sequelize.define('ContactGroup', {
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
    name: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'contact_groups',
    timestamps: true
  });

  ContactGroup.associate = (models) => {
    ContactGroup.belongsTo(models.User, { foreignKey: 'user_id' });
    ContactGroup.hasMany(models.ContactGroupMember, { foreignKey: 'group_id' });
  };

  return ContactGroup;
}; 