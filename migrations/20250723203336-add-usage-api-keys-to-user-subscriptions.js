'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('user_subscriptions', 'usage_api_keys', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of API keys currently created by the user'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('user_subscriptions', 'usage_api_keys');
  }
};
