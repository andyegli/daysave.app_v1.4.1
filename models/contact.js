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

  Contact.associate = (models) => {
    Contact.belongsTo(models.User, { foreignKey: 'user_id' });
    Contact.hasMany(models.ContactGroupMember, { foreignKey: 'contact_id' });
    Contact.hasMany(models.Relationship, { as: 'RelationshipContact1', foreignKey: 'contact_id_1' });
    Contact.hasMany(models.Relationship, { as: 'RelationshipContact2', foreignKey: 'contact_id_2' });
    Contact.hasMany(models.ContactRelation, { as: 'Contact1', foreignKey: 'contact_id_1' });
    Contact.hasMany(models.ContactRelation, { as: 'Contact2', foreignKey: 'contact_id_2' });
    Contact.hasMany(models.ShareLog, { foreignKey: 'contact_id' });
  };

  return Contact;
}; 