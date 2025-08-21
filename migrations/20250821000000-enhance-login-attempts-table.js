'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add missing columns to login_attempts table
    
    // Add risk_score column
    await queryInterface.addColumn('login_attempts', 'risk_score', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Risk score for the login attempt (0.00-1.00)'
    });

    // Add login_method column
    await queryInterface.addColumn('login_attempts', 'login_method', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Method used for login (password, oauth_google, 2fa_totp, etc.)'
    });

    // Add user_agent column
    await queryInterface.addColumn('login_attempts', 'user_agent', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'User agent string from the request'
    });

    // Add location_confidence column
    await queryInterface.addColumn('login_attempts', 'location_confidence', {
      type: Sequelize.DECIMAL(3, 2),
      allowNull: true,
      comment: 'Confidence level of geolocation data (0.00-1.00)'
    });

    // Modify country column to allow longer values
    await queryInterface.changeColumn('login_attempts', 'country', {
      type: Sequelize.STRING(10),
      allowNull: true,
      comment: 'Country code or identifier (ISO 3166-1 alpha-2 or custom)'
    });

    // Add indexes for better performance
    await queryInterface.addIndex('login_attempts', ['ip_address'], {
      name: 'idx_login_attempts_ip_address'
    });

    await queryInterface.addIndex('login_attempts', ['attempted_at'], {
      name: 'idx_login_attempts_attempted_at'
    });

    await queryInterface.addIndex('login_attempts', ['success'], {
      name: 'idx_login_attempts_success'
    });

    await queryInterface.addIndex('login_attempts', ['risk_score'], {
      name: 'idx_login_attempts_risk_score'
    });

    await queryInterface.addIndex('login_attempts', ['login_method'], {
      name: 'idx_login_attempts_login_method'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('login_attempts', 'idx_login_attempts_login_method');
    await queryInterface.removeIndex('login_attempts', 'idx_login_attempts_risk_score');
    await queryInterface.removeIndex('login_attempts', 'idx_login_attempts_success');
    await queryInterface.removeIndex('login_attempts', 'idx_login_attempts_attempted_at');
    await queryInterface.removeIndex('login_attempts', 'idx_login_attempts_ip_address');

    // Revert country column
    await queryInterface.changeColumn('login_attempts', 'country', {
      type: Sequelize.STRING(2),
      allowNull: true,
      comment: 'Country code (ISO 3166-1 alpha-2)'
    });

    // Remove added columns
    await queryInterface.removeColumn('login_attempts', 'location_confidence');
    await queryInterface.removeColumn('login_attempts', 'user_agent');
    await queryInterface.removeColumn('login_attempts', 'login_method');
    await queryInterface.removeColumn('login_attempts', 'risk_score');
  }
};
