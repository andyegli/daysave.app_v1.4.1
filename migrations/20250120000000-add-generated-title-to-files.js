'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('files', 'generated_title', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'AI-generated title for the file content (consistent with content table)'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('files', 'generated_title');
  }
}; 