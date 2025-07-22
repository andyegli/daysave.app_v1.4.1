'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('social_accounts', 'auth_type', {
      type: Sequelize.ENUM('oauth', 'credentials', 'hybrid'),
      allowNull: false,
      defaultValue: 'oauth',
      comment: 'Type of authentication: oauth for tokens, credentials for username/password, hybrid for both'
    });

    await queryInterface.addColumn('social_accounts', 'username', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Username for credential-based authentication'
    });

    await queryInterface.addColumn('social_accounts', 'encrypted_password', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Encrypted password for credential-based authentication'
    });

    await queryInterface.addColumn('social_accounts', 'credential_metadata', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Additional metadata for credential-based authentication (2FA settings, etc.)'
    });

    await queryInterface.addColumn('social_accounts', 'last_used_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when these credentials were last used for authentication'
    });

    await queryInterface.addColumn('social_accounts', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'expired', 'invalid'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status of the social media account credentials'
    });

    await queryInterface.addColumn('social_accounts', 'usage_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of times these credentials have been used'
    });

    // Make access_token nullable since credential-based accounts might not have tokens
    await queryInterface.changeColumn('social_accounts', 'access_token', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    // Make provider_user_id nullable since it might not apply to credential-based accounts
    await queryInterface.changeColumn('social_accounts', 'provider_user_id', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('social_accounts', 'auth_type');
    await queryInterface.removeColumn('social_accounts', 'username');
    await queryInterface.removeColumn('social_accounts', 'encrypted_password');
    await queryInterface.removeColumn('social_accounts', 'credential_metadata');
    await queryInterface.removeColumn('social_accounts', 'last_used_at');
    await queryInterface.removeColumn('social_accounts', 'status');
    await queryInterface.removeColumn('social_accounts', 'usage_count');

    // Restore original constraints
    await queryInterface.changeColumn('social_accounts', 'access_token', {
      type: Sequelize.TEXT,
      allowNull: false
    });

    await queryInterface.changeColumn('social_accounts', 'provider_user_id', {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
}; 