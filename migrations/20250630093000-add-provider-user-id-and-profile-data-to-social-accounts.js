"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("social_accounts", "provider_user_id", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: ""
    });
    await queryInterface.addColumn("social_accounts", "profile_data", {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("social_accounts", "provider_user_id");
    await queryInterface.removeColumn("social_accounts", "profile_data");
  }
}; 