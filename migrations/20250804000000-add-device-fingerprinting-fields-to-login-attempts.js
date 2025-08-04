'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('login_attempts', 'ip_address', {
      type: Sequelize.STRING(45),
      allowNull: true,
      comment: 'IP address of the login attempt'
    });

    await queryInterface.addColumn('login_attempts', 'attempted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when the login attempt occurred'
    });

    await queryInterface.addColumn('login_attempts', 'success', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether the login attempt was successful'
    });

    await queryInterface.addColumn('login_attempts', 'failure_reason', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Reason for login failure'
    });

    // Copy existing ip values to ip_address for backwards compatibility
    await queryInterface.sequelize.query(
      'UPDATE login_attempts SET ip_address = ip WHERE ip IS NOT NULL'
    );

    // Copy existing last_attempt_at values to attempted_at for backwards compatibility
    await queryInterface.sequelize.query(
      'UPDATE login_attempts SET attempted_at = last_attempt_at WHERE last_attempt_at IS NOT NULL'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('login_attempts', 'failure_reason');
    await queryInterface.removeColumn('login_attempts', 'success');
    await queryInterface.removeColumn('login_attempts', 'attempted_at');
    await queryInterface.removeColumn('login_attempts', 'ip_address');
  }
};