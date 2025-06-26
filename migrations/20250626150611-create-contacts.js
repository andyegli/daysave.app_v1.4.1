'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('contacts', {
      id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'users', key: 'id' }
      },
      name: { type: Sequelize.STRING },
      nickname: { type: Sequelize.STRING },
      organization: { type: Sequelize.STRING },
      job_title: { type: Sequelize.STRING },
      phones: { type: Sequelize.JSON },
      emails: { type: Sequelize.JSON },
      addresses: { type: Sequelize.JSON },
      social_profiles: { type: Sequelize.JSON },
      instant_messages: { type: Sequelize.JSON },
      urls: { type: Sequelize.JSON },
      dates: { type: Sequelize.JSON },
      notes: { type: Sequelize.JSON },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('contacts');
  }
};
