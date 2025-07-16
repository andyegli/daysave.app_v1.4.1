const db = require('../models');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Dynamic import for chai
let expect;
(async () => {
  const chai = await import('chai');
  expect = chai.expect;
})();

describe('Database Integration Tests', () => {
  let testData = {
    roles: [],
    permissions: [],
    users: [],
    contacts: [],
    content: [],
    files: []
  };

  // Generate random test data
  const generateRandomString = (length = 8) => {
    return Math.random().toString(36).substring(2, length + 2);
  };

  const generateRandomEmail = () => {
    return `test_${generateRandomString(6)}_${Date.now()}@example.com`;
  };

  const generateRandomUsername = () => {
    return `testuser_${generateRandomString(6)}_${Date.now()}`;
  };

  // Create log directory with proper permissions
  const ensureLogDirectory = (logPath) => {
    const logDir = path.dirname(logPath);
    
    try {
      // Check if directory exists
      if (!fs.existsSync(logDir)) {
        console.log(`📁 Creating log directory: ${logDir}`);
        fs.mkdirSync(logDir, { recursive: true, mode: 0o755 });
      }
      
      // Ensure directory is writable
      try {
        fs.accessSync(logDir, fs.constants.W_OK);
      } catch (error) {
        console.log(`🔧 Setting write permissions for: ${logDir}`);
        fs.chmodSync(logDir, 0o755);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Error creating log directory: ${error.message}`);
      return false;
    }
  };

  before(async () => {
    // Wait for chai to be imported
    if (!expect) {
      const chai = await import('chai');
      expect = chai.expect;
    }

    console.log('\n🧪 Starting Database Integration Tests...');
    console.log('📅 Test Date:', new Date().toISOString());
    console.log('🔗 Testing Sequelize connection...');
    
    try {
      await db.sequelize.authenticate();
      console.log('✅ Sequelize connection established');
    } catch (error) {
      console.error('❌ Sequelize connection failed:', error.message);
      throw error;
    }
  });

  after(async () => {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Clean up in reverse order of dependencies
      await db.sequelize.transaction(async (transaction) => {
        // Clean up many-to-many relationships first
        await db.RolePermission.destroy({ 
          where: { 
            role_id: testData.roles.map(r => r.id),
            permission_id: testData.permissions.map(p => p.id)
          },
          transaction 
        });

        // Clean up main entities
        await db.User.destroy({ where: { id: testData.users.map(u => u.id) }, transaction });
        await db.Contact.destroy({ where: { id: testData.contacts.map(c => c.id) }, transaction });
        await db.Content.destroy({ where: { id: testData.content.map(c => c.id) }, transaction });
        await db.File.destroy({ where: { id: testData.files.map(f => f.id) }, transaction });
        await db.Role.destroy({ where: { id: testData.roles.map(r => r.id) }, transaction });
        await db.Permission.destroy({ where: { id: testData.permissions.map(p => p.id) }, transaction });
      });

      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }

    // Write test log with proper directory handling
    const logEntry = {
      date: new Date().toISOString(),
      test: 'Database Integration Tests',
      status: 'completed',
      tables_tested: Object.keys(testData).length,
      records_created: Object.values(testData).reduce((sum, arr) => sum + arr.length, 0)
    };

    // Try multiple log locations in order of preference
    const logLocations = [
      path.join(__dirname, '../logs/database-tests.log'),
      path.join(__dirname, '../app-logs/database-tests.log'),
      '/tmp/daysave-database-tests.log'
    ];

    let logWritten = false;
    for (const logPath of logLocations) {
      if (ensureLogDirectory(logPath)) {
        try {
          fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
          console.log('📝 Test log written to:', logPath);
          logWritten = true;
          break;
        } catch (error) {
          console.warn(`⚠️ Could not write to ${logPath}: ${error.message}`);
          continue;
        }
      }
    }

    if (!logWritten) {
      console.error('❌ Could not write test log to any location');
    }
  });

  describe('Basic Database Operations', () => {
    it('should create and retrieve roles', async () => {
      const roleData = {
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for database testing',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const role = await db.Role.create(roleData);
      testData.roles.push(role);

      expect(role.id).to.equal(roleData.id);
      expect(role.name).to.equal(roleData.name);
      expect(role.description).to.equal(roleData.description);

      const retrievedRole = await db.Role.findByPk(role.id);
      expect(retrievedRole).to.not.be.null;
      expect(retrievedRole.name).to.equal(roleData.name);

      console.log('✅ Role creation and retrieval test passed');
    });

    it('should create and retrieve permissions', async () => {
      const permissionData = {
        id: uuidv4(),
        name: `test_permission_${generateRandomString(6)}`,
        description: 'Test permission for database testing',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const permission = await db.Permission.create(permissionData);
      testData.permissions.push(permission);

      expect(permission.id).to.equal(permissionData.id);
      expect(permission.name).to.equal(permissionData.name);

      const retrievedPermission = await db.Permission.findByPk(permission.id);
      expect(retrievedPermission).to.not.be.null;
      expect(retrievedPermission.name).to.equal(permissionData.name);

      console.log('✅ Permission creation and retrieval test passed');
    });

    it('should create and retrieve users with role association', async () => {
      // Create a test role first
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for user association',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      const userData = {
        id: uuidv4(),
        username: generateRandomUsername(),
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: role.id,
        subscription_status: 'trial',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = await db.User.create(userData);
      testData.users.push(user);

      expect(user.id).to.equal(userData.id);
      expect(user.username).to.equal(userData.username);
      expect(user.email).to.equal(userData.email);
      expect(user.role_id).to.equal(role.id);

      // Test association
      const userWithRole = await db.User.findByPk(user.id, {
        include: [{ model: db.Role }]
      });

      expect(userWithRole.Role).to.not.be.null;
      expect(userWithRole.Role.id).to.equal(role.id);
      expect(userWithRole.Role.name).to.equal(role.name);

      console.log('✅ User creation and role association test passed');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce foreign key constraints for users', async () => {
      const invalidUserData = {
        id: uuidv4(),
        username: generateRandomUsername(),
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: uuidv4(), // Invalid role ID
        subscription_status: 'trial',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      try {
        await db.User.create(invalidUserData);
        throw new Error('Should have failed due to foreign key constraint');
      } catch (error) {
        expect(error.name).to.equal('SequelizeForeignKeyConstraintError');
        console.log('✅ Foreign key constraint test passed');
      }
    });

    it('should enforce unique constraints for usernames', async () => {
      // Create a test role first
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for unique constraint test',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      const username = generateRandomUsername();
      const userData1 = {
        id: uuidv4(),
        username: username,
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: role.id,
        subscription_status: 'trial',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userData2 = {
        id: uuidv4(),
        username: username, // Same username
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: role.id,
        subscription_status: 'trial',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user1 = await db.User.create(userData1);
      testData.users.push(user1);

      try {
        await db.User.create(userData2);
        throw new Error('Should have failed due to unique constraint');
      } catch (error) {
        expect(error.name).to.equal('SequelizeUniqueConstraintError');
        console.log('✅ Unique constraint test passed');
      }
    });
  });

  describe('Many-to-Many Relationships', () => {
    it('should handle role-permission associations', async () => {
      // Create test role and permissions
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for many-to-many test',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      const permission1 = await db.Permission.create({
        id: uuidv4(),
        name: `test_permission_1_${generateRandomString(6)}`,
        description: 'Test permission 1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.permissions.push(permission1);

      const permission2 = await db.Permission.create({
        id: uuidv4(),
        name: `test_permission_2_${generateRandomString(6)}`,
        description: 'Test permission 2',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.permissions.push(permission2);

      // Associate role with permissions
      await role.addPermission(permission1);
      await role.addPermission(permission2);

      // Test the association
      const roleWithPermissions = await db.Role.findByPk(role.id, {
        include: [{ model: db.Permission }]
      });

      expect(roleWithPermissions.Permissions).to.have.length(2);
      expect(roleWithPermissions.Permissions.map(p => p.name)).to.include(permission1.name);
      expect(roleWithPermissions.Permissions.map(p => p.name)).to.include(permission2.name);

      console.log('✅ Many-to-many relationship test passed');
    });
  });

  describe('Complex Queries', () => {
    it('should perform complex joins and aggregations', async () => {
      // Create test data
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for complex queries',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      const user1 = await db.User.create({
        id: uuidv4(),
        username: generateRandomUsername(),
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: role.id,
        subscription_status: 'trial',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.users.push(user1);

      const user2 = await db.User.create({
        id: uuidv4(),
        username: generateRandomUsername(),
        email: generateRandomEmail(),
        password_hash: 'test_hashed_password',
        role_id: role.id,
        subscription_status: 'basic',
        language: 'en',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.users.push(user2);

      // Test complex query
      const usersWithRoles = await db.User.findAll({
        include: [{ model: db.Role }],
        where: {
          subscription_status: ['trial', 'basic']
        },
        order: [['createdAt', 'DESC']]
      });

      // Check that we have at least our 2 test users plus any others from previous tests
      expect(usersWithRoles.length).to.be.gte(2);
      expect(usersWithRoles[0].Role).to.not.be.null;
      expect(usersWithRoles[1].Role).to.not.be.null;

      console.log('✅ Complex query test passed');
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data integrity with transactions', async () => {
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for transaction test',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      try {
        await db.sequelize.transaction(async (transaction) => {
          const user1 = await db.User.create({
            id: uuidv4(),
            username: generateRandomUsername(),
            email: generateRandomEmail(),
            password_hash: 'test_hashed_password',
            role_id: role.id,
            subscription_status: 'trial',
            language: 'en',
            createdAt: new Date(),
            updatedAt: new Date()
          }, { transaction });

          const user2 = await db.User.create({
            id: uuidv4(),
            username: generateRandomUsername(),
            email: generateRandomEmail(),
            password_hash: 'test_hashed_password',
            role_id: role.id,
            subscription_status: 'basic',
            language: 'en',
            createdAt: new Date(),
            updatedAt: new Date()
          }, { transaction });

          testData.users.push(user1, user2);

          // This should succeed
          expect(user1.id).to.not.equal(user2.id);
        });

        console.log('✅ Transaction test passed');
      } catch (error) {
        console.error('❌ Transaction test failed:', error.message);
        throw error;
      }
    });
  });

  describe('Table Accessibility', () => {
    it('should access all tables through Sequelize models', async () => {
      const tableCounts = await Promise.all([
        db.Role.count(),
        db.Permission.count(),
        db.User.count(),
        db.UserDevice.count(),
        db.AuditLog.count(),
        db.SocialAccount.count(),
        db.Content.count(),
        db.File.count(),
        db.Contact.count(),
        db.ContactGroup.count(),
        db.ContentGroup.count(),
        db.ShareLog.count(),
        db.LoginAttempt.count(),
        db.ContactSubmission.count(),
        db.Relationship.count(),
        db.ContactRelation.count(),
        db.ContentRelation.count(),
        db.AdminSetting.count()
      ]);

      const tableNames = [
        'Roles', 'Permissions', 'Users', 'UserDevices', 'AuditLogs',
        'SocialAccounts', 'Content', 'Files', 'Contacts', 'ContactGroups',
        'ContentGroups', 'ShareLogs', 'LoginAttempts', 'ContactSubmissions',
        'Relationships', 'ContactRelations', 'ContentRelations', 'AdminSettings'
      ];

      console.log('\n📊 Table Record Counts:');
      tableNames.forEach((name, index) => {
        console.log(`  - ${name}: ${tableCounts[index]}`);
      });

      // All tables should be accessible (count should be a number)
      tableCounts.forEach((count, index) => {
        expect(count).to.be.a('number');
        expect(count).to.be.gte(0);
      });

      console.log('✅ All tables accessible through Sequelize models');
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUIDs for all entities', async () => {
      const role = await db.Role.create({
        id: uuidv4(),
        name: `test_role_${generateRandomString(6)}`,
        description: 'Test role for UUID test',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      testData.roles.push(role);

      // Test UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(role.id).to.match(uuidRegex);

      console.log('✅ UUID generation test passed');
    });
  });
}); 