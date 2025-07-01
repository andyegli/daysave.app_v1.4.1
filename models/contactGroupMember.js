const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContactGroupMember = sequelize.define('ContactGroupMember', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    contact_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    group_id: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contact_groups',
        key: 'id'
      }
    }
  }, {
    tableName: 'contact_group_members',
    timestamps: true
  });

  ContactGroupMember.associate = (models) => {
    ContactGroupMember.belongsTo(models.Contact, { foreignKey: 'contact_id' });
    ContactGroupMember.belongsTo(models.ContactGroup, { foreignKey: 'group_id' });
  };

  return ContactGroupMember;
}; 