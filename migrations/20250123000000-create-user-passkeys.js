'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_passkeys', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      credential_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Base64URL-encoded credential ID from WebAuthn'
      },
      credential_public_key: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Base64URL-encoded public key for credential verification'
      },
      credential_counter: {
        type: Sequelize.BIGINT,
        defaultValue: 0,
        comment: 'Signature counter for replay attack prevention'
      },
      device_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'User-friendly name for the device/authenticator'
      },
      device_type: {
        type: Sequelize.ENUM('phone', 'laptop', 'desktop', 'tablet', 'security_key', 'unknown'),
        defaultValue: 'unknown',
        comment: 'Type of device/authenticator used'
      },
      browser_info: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON string containing browser and platform information'
      },
      last_used_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of last successful authentication'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether this passkey is active and can be used for authentication'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for performance
    await queryInterface.addIndex('user_passkeys', ['user_id'], {
      name: 'idx_user_passkeys_user_id'
    });
    
    await queryInterface.addIndex('user_passkeys', ['credential_id'], {
      name: 'idx_user_passkeys_credential_id'
    });
    
    await queryInterface.addIndex('user_passkeys', ['last_used_at'], {
      name: 'idx_user_passkeys_last_used'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_passkeys');
  }
}; 