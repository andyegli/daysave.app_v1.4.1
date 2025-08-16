'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add unique constraint to prevent duplicate social accounts
    // This ensures one social account per user per platform per provider_user_id
    await queryInterface.addConstraint('social_accounts', {
      fields: ['user_id', 'platform', 'provider_user_id'],
      type: 'unique',
      name: 'unique_user_platform_provider'
    });

    console.log('✅ Added unique constraint to prevent duplicate social accounts');
  },

  async down(queryInterface, Sequelize) {
    // Remove the unique constraint
    await queryInterface.removeConstraint('social_accounts', 'unique_user_platform_provider');
    
    console.log('✅ Removed unique constraint from social accounts');
  }
};
