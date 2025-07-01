const { v4: uuidv4 } = require('uuid');

module.exports = (sequelize, DataTypes) => {
  const Permission = sequelize.define('Permission', {
    id: {
      type: DataTypes.CHAR(36),
      primaryKey: true,
      defaultValue: () => uuidv4(),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'permissions',
    timestamps: true
  });

  Permission.associate = (models) => {
    Permission.belongsToMany(models.Role, { through: models.RolePermission, foreignKey: 'permission_id' });
  };

  return Permission;
}; 