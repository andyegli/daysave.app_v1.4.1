'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('files', {
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
      filename: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      metadata: {
        type: Sequelize.JSON
      },
      transcription: {
        type: Sequelize.TEXT
      },
      summary: {
        type: Sequelize.TEXT
      },
      sentiment: {
        type: Sequelize.JSON
      },
      auto_tags: {
        type: Sequelize.JSON
      },
      user_tags: {
        type: Sequelize.JSON
      },
      user_comments: {
        type: Sequelize.TEXT
      },
      category: {
        type: Sequelize.STRING
      },
      location: {
        type: Sequelize.JSON
      },
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
    await queryInterface.dropTable('files');
  }
};
