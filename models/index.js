const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_USER_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
const User = require('./user')(sequelize, Sequelize.DataTypes);
const UserDevice = require('./userDevice')(sequelize, Sequelize.DataTypes);
const Role = require('./role')(sequelize, Sequelize.DataTypes);
const Permission = require('./permission')(sequelize, Sequelize.DataTypes);
const RolePermission = require('./rolePermission')(sequelize, Sequelize.DataTypes);
const AuditLog = require('./auditLog')(sequelize, Sequelize.DataTypes);
const SocialAccount = require('./socialAccount')(sequelize, Sequelize.DataTypes);
const Content = require('./content')(sequelize, Sequelize.DataTypes);
const File = require('./file')(sequelize, Sequelize.DataTypes);
const Contact = require('./contact')(sequelize, Sequelize.DataTypes);
const ContactGroup = require('./contactGroup')(sequelize, Sequelize.DataTypes);
const ContactGroupMember = require('./contactGroupMember')(sequelize, Sequelize.DataTypes);
const Relationship = require('./relationship')(sequelize, Sequelize.DataTypes);
const ContactRelation = require('./contactRelation')(sequelize, Sequelize.DataTypes);
const ContentGroup = require('./contentGroup')(sequelize, Sequelize.DataTypes);
const ContentGroupMember = require('./contentGroupMember')(sequelize, Sequelize.DataTypes);
const ContentRelation = require('./contentRelation')(sequelize, Sequelize.DataTypes);
const ShareLog = require('./shareLog')(sequelize, Sequelize.DataTypes);
const LoginAttempt = require('./loginAttempt')(sequelize, Sequelize.DataTypes);
const ContactSubmission = require('./contactSubmission')(sequelize, Sequelize.DataTypes);
const AdminSetting = require('./adminSetting')(sequelize, Sequelize.DataTypes);

db.User = User;
db.UserDevice = UserDevice;
db.Role = Role;
db.Permission = Permission;
db.RolePermission = RolePermission;
db.AuditLog = AuditLog;
db.SocialAccount = SocialAccount;
db.Content = Content;
db.File = File;
db.Contact = Contact;
db.ContactGroup = ContactGroup;
db.ContactGroupMember = ContactGroupMember;
db.Relationship = Relationship;
db.ContactRelation = ContactRelation;
db.ContentGroup = ContentGroup;
db.ContentGroupMember = ContentGroupMember;
db.ContentRelation = ContentRelation;
db.ShareLog = ShareLog;
db.LoginAttempt = LoginAttempt;
db.ContactSubmission = ContactSubmission;
db.AdminSetting = AdminSetting;

// Associations
// User and Role
db.User.belongsTo(db.Role, { foreignKey: 'role_id' });
db.Role.hasMany(db.User, { foreignKey: 'role_id' });
db.Role.belongsToMany(db.Permission, { through: db.RolePermission, foreignKey: 'role_id' });
db.Permission.belongsToMany(db.Role, { through: db.RolePermission, foreignKey: 'permission_id' });

// UserDevice
db.UserDevice.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.UserDevice, { foreignKey: 'user_id' });

// AuditLog
db.AuditLog.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.AuditLog, { foreignKey: 'user_id' });

// SocialAccount
db.SocialAccount.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.SocialAccount, { foreignKey: 'user_id' });

// Content
db.Content.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.Content, { foreignKey: 'user_id' });
db.Content.belongsTo(db.SocialAccount, { foreignKey: 'social_account_id' });
db.SocialAccount.hasMany(db.Content, { foreignKey: 'social_account_id' });

// File
db.File.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.File, { foreignKey: 'user_id' });

// Contact
db.Contact.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.Contact, { foreignKey: 'user_id' });

// ContactGroup
db.ContactGroup.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.ContactGroup, { foreignKey: 'user_id' });

// ContactGroupMember
db.ContactGroupMember.belongsTo(db.Contact, { foreignKey: 'contact_id' });
db.Contact.hasMany(db.ContactGroupMember, { foreignKey: 'contact_id' });
db.ContactGroupMember.belongsTo(db.ContactGroup, { foreignKey: 'group_id' });
db.ContactGroup.hasMany(db.ContactGroupMember, { foreignKey: 'group_id' });

// Relationship
db.Relationship.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.Relationship, { foreignKey: 'user_id' });
db.Relationship.belongsTo(db.Contact, { as: 'Contact1', foreignKey: 'contact_id_1' });
db.Relationship.belongsTo(db.Contact, { as: 'Contact2', foreignKey: 'contact_id_2' });

// ContactRelation
db.ContactRelation.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.ContactRelation, { foreignKey: 'user_id' });
db.ContactRelation.belongsTo(db.Contact, { as: 'Contact1', foreignKey: 'contact_id_1' });
db.ContactRelation.belongsTo(db.Contact, { as: 'Contact2', foreignKey: 'contact_id_2' });

// ContentGroup
db.ContentGroup.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.ContentGroup, { foreignKey: 'user_id' });

// ContentGroupMember
db.ContentGroupMember.belongsTo(db.Content, { foreignKey: 'content_id' });
db.Content.hasMany(db.ContentGroupMember, { foreignKey: 'content_id' });
db.ContentGroupMember.belongsTo(db.ContentGroup, { foreignKey: 'group_id' });
db.ContentGroup.hasMany(db.ContentGroupMember, { foreignKey: 'group_id' });

// ContentRelation
db.ContentRelation.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.ContentRelation, { foreignKey: 'user_id' });
db.ContentRelation.belongsTo(db.Content, { as: 'Content1', foreignKey: 'content_id_1' });
db.ContentRelation.belongsTo(db.Content, { as: 'Content2', foreignKey: 'content_id_2' });

// ShareLog
db.ShareLog.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.ShareLog, { foreignKey: 'user_id' });
db.ShareLog.belongsTo(db.Content, { foreignKey: 'content_id' });
db.Content.hasMany(db.ShareLog, { foreignKey: 'content_id' });
db.ShareLog.belongsTo(db.File, { foreignKey: 'file_id' });
db.File.hasMany(db.ShareLog, { foreignKey: 'file_id' });
db.ShareLog.belongsTo(db.Contact, { foreignKey: 'contact_id' });
db.Contact.hasMany(db.ShareLog, { foreignKey: 'contact_id' });

// LoginAttempt
db.LoginAttempt.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.LoginAttempt, { foreignKey: 'user_id' });

// ContactSubmission
db.ContactSubmission.belongsTo(db.User, { foreignKey: 'user_id', allowNull: true });
db.User.hasMany(db.ContactSubmission, { foreignKey: 'user_id', allowNull: true });

// AdminSetting
db.AdminSetting.belongsTo(db.User, { foreignKey: 'user_id' });
db.User.hasMany(db.AdminSetting, { foreignKey: 'user_id' });

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

testConnection();

module.exports = db; 