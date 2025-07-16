'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('content', 'generated_title', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'AI-generated title based on content summary'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('content', 'generated_title');
  }
}; 