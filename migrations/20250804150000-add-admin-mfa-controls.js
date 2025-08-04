'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'mfa_required', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether MFA is required by admin for this user'
    });

    await queryInterface.addColumn('users', 'mfa_enforced_by', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Admin user who enforced MFA requirement'
    });

    await queryInterface.addColumn('users', 'mfa_enforced_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'When MFA requirement was enforced'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'mfa_required');
    await queryInterface.removeColumn('users', 'mfa_enforced_by');
    await queryInterface.removeColumn('users', 'mfa_enforced_at');
  }
};