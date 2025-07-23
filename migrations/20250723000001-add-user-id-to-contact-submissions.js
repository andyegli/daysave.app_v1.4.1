'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('contact_submissions', 'user_id', {
      type: Sequelize.CHAR(36),
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional reference to the user who made this contact submission'
    });

    // Add index for better query performance
    await queryInterface.addIndex('contact_submissions', ['user_id'], {
      name: 'idx_contact_submissions_user_id'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('contact_submissions', 'idx_contact_submissions_user_id');
    
    // Remove column
    await queryInterface.removeColumn('contact_submissions', 'user_id');
  }
}; 