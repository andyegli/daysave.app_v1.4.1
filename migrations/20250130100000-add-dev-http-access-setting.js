'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('admin_settings', 'allow_dev_http_any_ip', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Allow HTTP access from any IP during development (security risk - dev only)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('admin_settings', 'allow_dev_http_any_ip');
  }
};