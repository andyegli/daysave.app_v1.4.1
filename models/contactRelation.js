const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const ContactRelation = sequelize.define('ContactRelation', {
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
    contact_id_1: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    contact_id_2: {
      type: DataTypes.CHAR(36),
      allowNull: false,
      references: {
        model: 'contacts',
        key: 'id'
      }
    },
    relation_type: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'contact_relations',
    timestamps: true
  });

  ContactRelation.associate = (models) => {
    ContactRelation.belongsTo(models.User, { foreignKey: 'user_id' });
    ContactRelation.belongsTo(models.Contact, { as: 'Contact1', foreignKey: 'contact_id_1' });
    ContactRelation.belongsTo(models.Contact, { as: 'Contact2', foreignKey: 'contact_id_2' });
  };

  return ContactRelation;
}; 