'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('user_devices', 'device_details', {
      type: Sequelize.JSON,
      allowNull: true,
      comment: 'Detailed device fingerprint information as JSON'
    });

    await queryInterface.addColumn('user_devices', 'browser_name', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Browser name (Chrome, Firefox, Safari, etc.)'
    });

    await queryInterface.addColumn('user_devices', 'browser_version', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Browser version'
    });

    await queryInterface.addColumn('user_devices', 'os_name', {
      type: Sequelize.STRING(50),
      allowNull: true,
      comment: 'Operating system name'
    });

    await queryInterface.addColumn('user_devices', 'os_version', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Operating system version'
    });

    await queryInterface.addColumn('user_devices', 'device_type', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Device type (desktop, mobile, tablet)'
    });

    await queryInterface.addColumn('user_devices', 'screen_resolution', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'Screen resolution (e.g., 1920x1080)'
    });

    await queryInterface.addColumn('user_devices', 'user_agent', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Full user agent string'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_devices', 'user_agent');
    await queryInterface.removeColumn('user_devices', 'screen_resolution');
    await queryInterface.removeColumn('user_devices', 'device_type');
    await queryInterface.removeColumn('user_devices', 'os_version');
    await queryInterface.removeColumn('user_devices', 'os_name');
    await queryInterface.removeColumn('user_devices', 'browser_version');
    await queryInterface.removeColumn('user_devices', 'browser_name');
    await queryInterface.removeColumn('user_devices', 'device_details');
  }
};