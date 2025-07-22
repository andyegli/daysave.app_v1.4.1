/**
 * Social Media Credential Service
 * 
 * Handles secure storage, encryption, and management of social media account credentials
 * for bypassing content restrictions when accessing social media URLs.
 * 
 * Features:
 * - Credential encryption/decryption using AES-256-GCM
 * - Platform-specific authentication logic
 * - Credential validation and testing
 * - Usage tracking and analytics
 * - Security monitoring and alerts
 * 
 * @author DaySave Development Team
 * @version 1.0.0
 */

const crypto = require('crypto');
const { SocialAccount } = require('../models');
const { logAuthEvent, logAuthError } = require('../config/logger');

class SocialMediaCredentialService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    
    // Get encryption key from environment or generate one
    this.encryptionKey = this.getEncryptionKey();
    
    // Supported platforms for credential-based authentication
    this.supportedPlatforms = [
      'instagram', 
      'facebook', 
      'twitter', 
      'youtube', 
      'tiktok', 
      'linkedin', 
      'pinterest', 
      'reddit',
      'snapchat',
      'discord'
    ];
  }

  /**
   * Get or generate encryption key for credential storage
   * @returns {Buffer} Encryption key
   */
  getEncryptionKey() {
    const keyString = process.env.SOCIAL_CREDENTIAL_ENCRYPTION_KEY;
    
    if (keyString) {
      return Buffer.from(keyString, 'hex');
    }
    
    // Generate a new key if none exists (development only)
    if (process.env.NODE_ENV === 'development') {
      const newKey = crypto.randomBytes(this.keyLength);
      console.warn('⚠️ No SOCIAL_CREDENTIAL_ENCRYPTION_KEY found. Generated temporary key for development.');
      console.warn('📝 Add this to your .env file:', newKey.toString('hex'));
      return newKey;
    }
    
    throw new Error('SOCIAL_CREDENTIAL_ENCRYPTION_KEY environment variable is required for production');
  }

  /**
   * Encrypt password for secure storage
   * @param {string} password - Plain text password
   * @returns {string} Encrypted password with IV and auth tag
   */
  encryptPassword(password) {
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey, { iv });
      
      let encrypted = cipher.update(password, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV, auth tag, and encrypted data
      const combined = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
      
      return combined;
    } catch (error) {
      console.error('❌ Password encryption failed:', error);
      throw new Error('Failed to encrypt password');
    }
  }

  /**
   * Decrypt password from storage
   * @param {string} encryptedPassword - Encrypted password string
   * @returns {string} Plain text password
   */
  decryptPassword(encryptedPassword) {
    try {
      const parts = encryptedPassword.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted password format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(this.algorithm, this.encryptionKey, { iv });
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Password decryption failed:', error);
      throw new Error('Failed to decrypt password');
    }
  }

  /**
   * Add or update social media account credentials
   * @param {string} userId - User ID
   * @param {Object} credentials - Credential data
   * @returns {Promise<Object>} Created/updated social account
   */
  async addCredentials(userId, credentials) {
    try {
      const { platform, username, password, handle, metadata = {} } = credentials;
      
      // Validate required fields
      if (!platform || !username || !password) {
        throw new Error('Platform, username, and password are required');
      }
      
      // Check if platform is supported
      if (!this.supportedPlatforms.includes(platform.toLowerCase())) {
        throw new Error(`Platform ${platform} is not supported for credential-based authentication`);
      }
      
      // Encrypt the password
      const encryptedPassword = this.encryptPassword(password);
      
      // Check if account already exists
      const existingAccount = await SocialAccount.findOne({
        where: {
          user_id: userId,
          platform: platform.toLowerCase(),
          auth_type: ['credentials', 'hybrid']
        }
      });
      
      let socialAccount;
      
      if (existingAccount) {
        // Update existing account
        socialAccount = await existingAccount.update({
          username,
          encrypted_password: encryptedPassword,
          handle: handle || username,
          credential_metadata: {
            ...existingAccount.credential_metadata,
            ...metadata,
            updated_at: new Date().toISOString()
          },
          status: 'active'
        });
        
        logAuthEvent('SOCIAL_CREDENTIALS_UPDATED', {
          userId,
          platform,
          username,
          accountId: socialAccount.id
        });
      } else {
        // Create new account
        socialAccount = await SocialAccount.create({
          user_id: userId,
          platform: platform.toLowerCase(),
          auth_type: 'credentials',
          username,
          encrypted_password: encryptedPassword,
          handle: handle || username,
          credential_metadata: {
            ...metadata,
            created_at: new Date().toISOString()
          },
          status: 'active',
          usage_count: 0
        });
        
        logAuthEvent('SOCIAL_CREDENTIALS_ADDED', {
          userId,
          platform,
          username,
          accountId: socialAccount.id
        });
      }
      
      return socialAccount;
    } catch (error) {
      logAuthError('SOCIAL_CREDENTIALS_ADD_ERROR', error, { userId, platform: credentials.platform });
      throw error;
    }
  }

  /**
   * Get user's social media credentials for a platform
   * @param {string} userId - User ID
   * @param {string} platform - Platform name
   * @returns {Promise<Object|null>} Decrypted credentials or null if not found
   */
  async getCredentials(userId, platform) {
    try {
      const socialAccount = await SocialAccount.findOne({
        where: {
          user_id: userId,
          platform: platform.toLowerCase(),
          auth_type: ['credentials', 'hybrid'],
          status: 'active'
        }
      });
      
      if (!socialAccount || !socialAccount.encrypted_password) {
        return null;
      }
      
      // Decrypt password
      const password = this.decryptPassword(socialAccount.encrypted_password);
      
      return {
        id: socialAccount.id,
        platform: socialAccount.platform,
        username: socialAccount.username,
        password,
        handle: socialAccount.handle,
        metadata: socialAccount.credential_metadata,
        lastUsed: socialAccount.last_used_at,
        usageCount: socialAccount.usage_count
      };
    } catch (error) {
      logAuthError('SOCIAL_CREDENTIALS_GET_ERROR', error, { userId, platform });
      return null;
    }
  }

  /**
   * Get all user's social media accounts
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of social accounts (without decrypted passwords)
   */
  async getUserAccounts(userId) {
    try {
      const accounts = await SocialAccount.findAll({
        where: { user_id: userId },
        attributes: [
          'id', 'platform', 'auth_type', 'username', 'handle', 
          'status', 'last_used_at', 'usage_count', 'createdAt', 'updatedAt'
        ],
        order: [['platform', 'ASC'], ['createdAt', 'DESC']]
      });
      
      return accounts.map(account => ({
        id: account.id,
        platform: account.platform,
        authType: account.auth_type,
        username: account.username,
        handle: account.handle,
        status: account.status,
        lastUsed: account.last_used_at,
        usageCount: account.usage_count,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        hasCredentials: account.auth_type !== 'oauth'
      }));
    } catch (error) {
      logAuthError('SOCIAL_ACCOUNTS_GET_ERROR', error, { userId });
      throw error;
    }
  }

  /**
   * Update credential usage tracking
   * @param {string} accountId - Social account ID
   * @param {boolean} success - Whether the authentication was successful
   * @returns {Promise<void>}
   */
  async trackUsage(accountId, success = true) {
    try {
      const updateData = {
        last_used_at: new Date(),
        usage_count: require('sequelize').literal('usage_count + 1')
      };
      
      if (!success) {
        updateData.status = 'invalid';
      }
      
      await SocialAccount.update(updateData, {
        where: { id: accountId }
      });
      
      logAuthEvent('SOCIAL_CREDENTIALS_USED', {
        accountId,
        success,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logAuthError('SOCIAL_CREDENTIALS_TRACK_ERROR', error, { accountId, success });
    }
  }

  /**
   * Delete social media account credentials
   * @param {string} userId - User ID
   * @param {string} accountId - Account ID to delete
   * @returns {Promise<boolean>} Success status
   */
  async deleteCredentials(userId, accountId) {
    try {
      const deleted = await SocialAccount.destroy({
        where: {
          id: accountId,
          user_id: userId
        }
      });
      
      if (deleted > 0) {
        logAuthEvent('SOCIAL_CREDENTIALS_DELETED', {
          userId,
          accountId
        });
        return true;
      }
      
      return false;
    } catch (error) {
      logAuthError('SOCIAL_CREDENTIALS_DELETE_ERROR', error, { userId, accountId });
      throw error;
    }
  }

  /**
   * Test social media credentials by attempting a login
   * @param {string} platform - Platform name
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} Test result
   */
  async testCredentials(platform, username, password) {
    try {
      // This is a placeholder for actual credential testing
      // In a real implementation, you would attempt to authenticate with the platform
      
      const testResult = {
        platform,
        username,
        success: false,
        message: 'Credential testing not yet implemented',
        timestamp: new Date().toISOString()
      };
      
      // For now, assume credentials are valid if they meet basic requirements
      if (username && password && username.length > 0 && password.length >= 6) {
        testResult.success = true;
        testResult.message = 'Credentials appear valid (basic validation only)';
      } else {
        testResult.message = 'Username or password does not meet minimum requirements';
      }
      
      logAuthEvent('SOCIAL_CREDENTIALS_TESTED', {
        platform,
        username,
        success: testResult.success
      });
      
      return testResult;
    } catch (error) {
      logAuthError('SOCIAL_CREDENTIALS_TEST_ERROR', error, { platform, username });
      return {
        platform,
        username,
        success: false,
        message: `Credential testing failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get supported platforms for credential-based authentication
   * @returns {Array} Array of supported platform objects
   */
  getSupportedPlatforms() {
    return [
      { name: 'instagram', displayName: 'Instagram', icon: 'bi-instagram', color: '#E4405F' },
      { name: 'facebook', displayName: 'Facebook', icon: 'bi-facebook', color: '#1877F2' },
      { name: 'twitter', displayName: 'Twitter/X', icon: 'bi-twitter-x', color: '#000000' },
      { name: 'youtube', displayName: 'YouTube', icon: 'bi-youtube', color: '#FF0000' },
      { name: 'tiktok', displayName: 'TikTok', icon: 'bi-tiktok', color: '#000000' },
      { name: 'linkedin', displayName: 'LinkedIn', icon: 'bi-linkedin', color: '#0A66C2' },
      { name: 'pinterest', displayName: 'Pinterest', icon: 'bi-pinterest', color: '#BD081C' },
      { name: 'reddit', displayName: 'Reddit', icon: 'bi-reddit', color: '#FF4500' },
      { name: 'snapchat', displayName: 'Snapchat', icon: 'bi-snapchat', color: '#FFFC00' },
      { name: 'discord', displayName: 'Discord', icon: 'bi-discord', color: '#5865F2' }
    ];
  }
}

module.exports = new SocialMediaCredentialService(); 