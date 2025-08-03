'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add geolocation fields to login_attempts table
      await queryInterface.addColumn('login_attempts', 'country', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Country code (ISO 3166-1 alpha-2)'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'region', {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: 'Region/state code'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'City name'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'latitude', {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude coordinate'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'longitude', {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude coordinate'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'timezone', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Timezone identifier'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'isp', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Internet Service Provider'
      }, { transaction });

      await queryInterface.addColumn('login_attempts', 'is_vpn', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether IP appears to be from VPN/proxy'
      }, { transaction });

      // Add geolocation fields to user_devices table
      await queryInterface.addColumn('user_devices', 'country', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Country code (ISO 3166-1 alpha-2)'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'region', {
        type: Sequelize.STRING(3),
        allowNull: true,
        comment: 'Region/state code'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'City name'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'latitude', {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Latitude coordinate'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'longitude', {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Longitude coordinate'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'timezone', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Timezone identifier'
      }, { transaction });

      await queryInterface.addColumn('user_devices', 'location_confidence', {
        type: Sequelize.DECIMAL(3, 2),
        allowNull: true,
        comment: 'Confidence score for location accuracy (0-1)'
      }, { transaction });

      // Add geolocation tracking to users table for last known location
      await queryInterface.addColumn('users', 'last_login_country', {
        type: Sequelize.STRING(2),
        allowNull: true,
        comment: 'Last login country code'
      }, { transaction });

      await queryInterface.addColumn('users', 'last_login_city', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Last login city'
      }, { transaction });

      await queryInterface.addColumn('users', 'location_changed_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when location significantly changed'
      }, { transaction });

      await transaction.commit();
      console.log('✅ Geolocation fields added successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error adding geolocation fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove geolocation fields from login_attempts table
      await queryInterface.removeColumn('login_attempts', 'country', { transaction });
      await queryInterface.removeColumn('login_attempts', 'region', { transaction });
      await queryInterface.removeColumn('login_attempts', 'city', { transaction });
      await queryInterface.removeColumn('login_attempts', 'latitude', { transaction });
      await queryInterface.removeColumn('login_attempts', 'longitude', { transaction });
      await queryInterface.removeColumn('login_attempts', 'timezone', { transaction });
      await queryInterface.removeColumn('login_attempts', 'isp', { transaction });
      await queryInterface.removeColumn('login_attempts', 'is_vpn', { transaction });

      // Remove geolocation fields from user_devices table
      await queryInterface.removeColumn('user_devices', 'country', { transaction });
      await queryInterface.removeColumn('user_devices', 'region', { transaction });
      await queryInterface.removeColumn('user_devices', 'city', { transaction });
      await queryInterface.removeColumn('user_devices', 'latitude', { transaction });
      await queryInterface.removeColumn('user_devices', 'longitude', { transaction });
      await queryInterface.removeColumn('user_devices', 'timezone', { transaction });
      await queryInterface.removeColumn('user_devices', 'location_confidence', { transaction });

      // Remove geolocation fields from users table
      await queryInterface.removeColumn('users', 'last_login_country', { transaction });
      await queryInterface.removeColumn('users', 'last_login_city', { transaction });
      await queryInterface.removeColumn('users', 'location_changed_at', { transaction });

      await transaction.commit();
      console.log('✅ Geolocation fields removed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error removing geolocation fields:', error);
      throw error;
    }
  }
};