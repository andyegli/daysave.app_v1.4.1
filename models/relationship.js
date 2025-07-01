const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Relationship = sequelize.define('Relationship', {
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
    relationship_type: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    tableName: 'relationships',
    timestamps: true
  });

  Relationship.associate = (models) => {
    Relationship.belongsTo(models.User, { foreignKey: 'user_id' });
    Relationship.belongsTo(models.Contact, { as: 'Contact1', foreignKey: 'contact_id_1' });
    Relationship.belongsTo(models.Contact, { as: 'Contact2', foreignKey: 'contact_id_2' });
  };

  return Relationship;
}; 