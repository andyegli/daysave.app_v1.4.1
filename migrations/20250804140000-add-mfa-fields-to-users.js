'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'totp_secret', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'TOTP secret for two-factor authentication'
    });

    await queryInterface.addColumn('users', 'totp_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether two-factor authentication is enabled'
    });

    await queryInterface.addColumn('users', 'totp_backup_codes', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of backup codes for 2FA recovery'
    });

    await queryInterface.addColumn('users', 'last_password_change', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp of last password change'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'totp_secret');
    await queryInterface.removeColumn('users', 'totp_enabled');
    await queryInterface.removeColumn('users', 'totp_backup_codes');
    await queryInterface.removeColumn('users', 'last_password_change');
  }
};