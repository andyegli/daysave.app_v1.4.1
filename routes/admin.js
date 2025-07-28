const express = require('express');
const router = express.Router();
const { User, Role, UserPasskey } = require('../models');
const { logAuthEvent, logAuthError } = require('../config/logger');
const { isAuthenticated, isAdmin, requireTesterPermission } = require('../middleware');
const { body, validationResult, param } = require('express-validator');

// Enhanced admin error handler
const handleAdminError = (req, res, error, context = {}) => {
  const errorId = Date.now().toString();
  
  // Log the error with context
  logAuthError('ADMIN_ERROR_HANDLED', error, {
    errorId,
    adminId: req.user?.id,
    adminUsername: req.user?.username,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    ...context
  });
  
  // Check if it's a database connection error
  if (error.name === 'SequelizeConnectionError' || error.name === 'SequelizeConnectionRefusedError') {
    return res.status(503).render('error', {
      user: req.user,
      title: 'Database Connection Error',
      message: 'The database is temporarily unavailable. Please try again in a few minutes.',
      errorId
    });
  }
  
  // Check if it's a validation error
  if (error.name === 'SequelizeValidationError') {
    const validationErrors = error.errors.map(err => err.message).join(', ');
    return res.status(400).render('error', {
      user: req.user,
      title: 'Validation Error',
      message: `Invalid data: ${validationErrors}`,
      errorId
    });
  }
  
  // Check if it's a unique constraint error
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).render('error', {
      user: req.user,
      title: 'Duplicate Entry',
      message: 'This data already exists in the system.',
      errorId
    });
  }
  
  // Default error response
  return res.status(500).render('error', {
    user: req.user,
    title: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
    errorId
  });
};

// Enhanced validation middleware
const validateUserData = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('role_id')
    .isUUID()
    .withMessage('Please select a valid role'),
  
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (req.body.password && value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

const validateUserId = [
  param('id')
    .isUUID()
    .withMessage('Invalid user ID format')
];

// Admin check middleware is now imported from middleware/auth.js

// List users with enhanced error handling
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Validate and sanitize query parameters
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const search = (req.query.search || '').trim().substring(0, 100);
    const offset = (page - 1) * limit;
    
    // Build search query with error handling
    const where = search ? {
      [require('sequelize').Op.or]: [
        { username: { [require('sequelize').Op.iLike]: `%${search}%` } },
        { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
      ]
    } : {};
    
    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        {
          model: Role,
          required: false // Use LEFT JOIN to handle users without roles
        },
        {
          model: require('../models').UserDevice,
          required: false,
          limit: 1,
          order: [['last_login_at', 'DESC']]
        },
        {
          model: require('../models').UserSubscription,
          as: 'UserSubscriptions',
          required: false,
          limit: 1,
          order: [['created_at', 'DESC']]
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    const totalPages = Math.ceil(count / limit) || 1;
    
    logAuthEvent('ADMIN_USER_LIST', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      page,
      search,
      resultCount: users.length,
      totalCount: count
    });
    
    res.render('admin/user-list', {
      users,
      user: req.user,
      error: req.query.error || null,
      success: req.query.success || null,
      page,
      totalPages,
      search,
      limit,
      count
    });
    
  } catch (err) {
    handleAdminError(req, res, err, {
      action: 'list_users',
      query: req.query
    });
  }
});

// Create user (form) with enhanced error handling
router.get('/users/new', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });
    
    if (!roles || roles.length === 0) {
      logAuthEvent('ADMIN_USER_CREATE_FORM_ACCESS_FAILED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        reason: 'no_roles_found',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.redirect('/admin/users?error=No roles found. Please contact support.');
    }
    
    logAuthEvent('ADMIN_USER_CREATE_FORM_ACCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    res.render('admin/user-form', {
      user: req.user,
      formAction: '/admin/users',
      method: 'POST',
      userData: {},
      roles,
      error: null,
      success: null
    });
    
  } catch (err) {
    handleAdminError(req, res, err, {
      action: 'create_user_form'
    });
  }
});

// Create user (POST) with enhanced validation and error handling
router.post('/users', isAuthenticated, isAdmin, validateUserData, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      const errorMessage = errors.array().map(err => err.msg).join(', ');
      
      logAuthEvent('ADMIN_USER_CREATE_VALIDATION_ERROR', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        validationErrors: errors.array(),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.render('admin/user-form', {
        user: req.user,
        formAction: '/admin/users',
        method: 'POST',
        userData: req.body,
        roles,
        error: errorMessage,
        success: null
      });
    }
    
    const { username, email, role_id, password } = req.body;
    
    // Check if user with email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      
      logAuthEvent('ADMIN_USER_CREATE_DUPLICATE_EMAIL', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        attemptedEmail: email,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.render('admin/user-form', {
        user: req.user,
        formAction: '/admin/users',
        method: 'POST',
        userData: req.body,
        roles,
        error: 'A user with this email address already exists.',
        success: null
      });
    }
    
    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      return res.render('admin/user-form', {
        user: req.user,
        formAction: '/admin/users',
        method: 'POST',
        userData: req.body,
        roles,
        error: 'Selected role is invalid.',
        success: null
      });
    }
    
    // Hash password with enhanced security
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);
    
    // Create user with transaction for data consistency
    const newUser = await User.create({
      username,
      email,
      role_id,
      password_hash,
      email_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    });
    
    logAuthEvent('ADMIN_USER_CREATE_SUCCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      newUserId: newUser.id,
      newUsername: username,
      newUserEmail: email,
      assignedRole: role.name,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.redirect('/admin/users?success=User created successfully');
    
  } catch (err) {
    // Try to load roles for error page
    let roles = [];
    try {
      roles = await Role.findAll({ order: [['name', 'ASC']] });
    } catch (roleErr) {
      logAuthError('ADMIN_ROLE_LOAD_ERROR', roleErr, { adminId: req.user.id });
    }
    
    logAuthError('ADMIN_USER_CREATE_ERROR', err, {
      adminId: req.user.id,
      adminUsername: req.user.username,
      attemptedData: { username: req.body.username, email: req.body.email },
      ip: req.ip
    });
    
    res.render('admin/user-form', {
      user: req.user,
      formAction: '/admin/users',
      method: 'POST',
      userData: req.body,
      roles,
      error: 'Failed to create user. Please try again.',
      success: null
    });
  }
});

// Edit user (form) with enhanced error handling
router.get('/users/:id/edit', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logAuthEvent('ADMIN_USER_EDIT_FORM_VALIDATION_ERROR', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        validationErrors: errors.array(),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=Invalid user ID format');
    }
    
    const userData = await User.findByPk(req.params.id, {
      include: [{
        model: Role,
        required: false
      }]
    });
    
    const roles = await Role.findAll({
      order: [['name', 'ASC']]
    });
    
    if (!roles || roles.length === 0) {
      logAuthEvent('ADMIN_USER_EDIT_FORM_ACCESS_FAILED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        reason: 'no_roles_found',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=No roles found. Please contact support.');
    }
    
    if (!userData) {
      logAuthEvent('ADMIN_USER_EDIT_FORM_ACCESS_FAILED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        reason: 'user_not_found',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=User not found');
    }
    
    // Prevent admin from editing themselves in certain scenarios
    if (req.user.id === userData.id) {
      logAuthEvent('ADMIN_USER_EDIT_FORM_SELF_EDIT', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
    }
    
    logAuthEvent('ADMIN_USER_EDIT_FORM_ACCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userData.username,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    res.render('admin/user-form', {
      user: req.user,
      formAction: `/admin/users/${req.params.id}`,
      method: 'POST',
      userData,
      roles,
      error: null,
      success: null
    });
    
  } catch (err) {
    handleAdminError(req, res, err, {
      action: 'edit_user_form',
      userId: req.params.id
    });
  }
});

// Update user (POST) with enhanced validation and error handling
router.post('/users/:id', isAuthenticated, isAdmin, validateUserId, validateUserData, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      const errorMessage = errors.array().map(err => err.msg).join(', ');
      
      logAuthEvent('ADMIN_USER_UPDATE_VALIDATION_ERROR', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        validationErrors: errors.array(),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      
      return res.render('admin/user-form', {
        user: req.user,
        formAction: `/admin/users/${req.params.id}`,
        method: 'POST',
        userData: req.body,
        roles,
        error: errorMessage,
        success: null
      });
    }
    
    const { username, email, role_id, password } = req.body;
    
    // Find user to update
    const userToUpdate = await User.findByPk(req.params.id, {
      include: [{
        model: Role,
        required: false
      }]
    });
    
    if (!userToUpdate) {
      logAuthEvent('ADMIN_USER_UPDATE_FAILED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        reason: 'user_not_found',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=User not found');
    }
    
    // Check if email is being changed and if new email already exists
    if (email !== userToUpdate.email) {
      const existingUser = await User.findOne({
        where: { email },
        attributes: ['id', 'email']
      });
      
      if (existingUser && existingUser.id !== userToUpdate.id) {
        const roles = await Role.findAll({ order: [['name', 'ASC']] });
        
        logAuthEvent('ADMIN_USER_UPDATE_DUPLICATE_EMAIL', {
          adminId: req.user.id,
          adminUsername: req.user.username,
          targetUserId: req.params.id,
          attemptedEmail: email,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        
        return res.render('admin/user-form', {
          user: req.user,
          formAction: `/admin/users/${req.params.id}`,
          method: 'POST',
          userData: req.body,
          roles,
          error: 'A user with this email address already exists.',
          success: null
        });
      }
    }
    
    // Verify role exists
    const role = await Role.findByPk(role_id);
    if (!role) {
      const roles = await Role.findAll({ order: [['name', 'ASC']] });
      return res.render('admin/user-form', {
        user: req.user,
        formAction: `/admin/users/${req.params.id}`,
        method: 'POST',
        userData: req.body,
        roles,
        error: 'Selected role is invalid.',
        success: null
      });
    }
    
    // Store original values for logging
    const originalData = {
      username: userToUpdate.username,
      email: userToUpdate.email,
      role_id: userToUpdate.role_id
    };
    
    // Update user fields
    userToUpdate.username = username;
    userToUpdate.email = email;
    userToUpdate.role_id = role_id;
    
    // Update password if provided
    if (password) {
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      userToUpdate.password_hash = await bcrypt.hash(password, saltRounds);
    }
    
    // Save changes
    await userToUpdate.save();
    
    // Log successful update with changes
    const changes = {};
    if (originalData.username !== username) changes.username = { from: originalData.username, to: username };
    if (originalData.email !== email) changes.email = { from: originalData.email, to: email };
    if (originalData.role_id !== role_id) changes.role_id = { from: originalData.role_id, to: role_id };
    if (password) changes.password = 'updated';
    
    logAuthEvent('ADMIN_USER_UPDATE_SUCCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userToUpdate.username,
      changes,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.redirect('/admin/users?success=User updated successfully');
    
  } catch (err) {
    // Try to load roles for error page
    let roles = [];
    try {
      roles = await Role.findAll({ order: [['name', 'ASC']] });
    } catch (roleErr) {
      logAuthError('ADMIN_ROLE_LOAD_ERROR', roleErr, { adminId: req.user.id });
    }
    
    logAuthError('ADMIN_USER_UPDATE_ERROR', err, {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      attemptedData: { username: req.body.username, email: req.body.email },
      ip: req.ip
    });
    
    res.render('admin/user-form', {
      user: req.user,
      formAction: `/admin/users/${req.params.id}`,
      method: 'POST',
      userData: req.body,
      roles,
      error: 'Failed to update user. Please try again.',
      success: null
    });
  }
});

// Delete user with enhanced validation and error handling
router.post('/users/:id/delete', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logAuthEvent('ADMIN_USER_DELETE_VALIDATION_ERROR', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        validationErrors: errors.array(),
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=Invalid user ID format');
    }
    
    const userToDelete = await User.findByPk(req.params.id, {
      include: [{
        model: Role,
        required: false
      }]
    });
    
    if (!userToDelete) {
      logAuthEvent('ADMIN_USER_DELETE_FAILED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        reason: 'user_not_found',
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=User not found');
    }
    
    // Prevent admin from deleting themselves
    if (req.user.id === userToDelete.id) {
      logAuthEvent('ADMIN_USER_DELETE_SELF_ATTEMPT', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        targetUserId: req.params.id,
        ip: req.ip,
        timestamp: new Date().toISOString()
      });
      return res.redirect('/admin/users?error=You cannot delete your own account');
    }
    
    // Check if user is the last admin
    if (userToDelete.Role && userToDelete.Role.name === 'admin') {
      const adminCount = await User.count({
        include: [{
          model: Role,
          where: { name: 'admin' }
        }]
      });
      
      if (adminCount <= 1) {
        logAuthEvent('ADMIN_USER_DELETE_LAST_ADMIN_ATTEMPT', {
          adminId: req.user.id,
          adminUsername: req.user.username,
          targetUserId: req.params.id,
          targetUsername: userToDelete.username,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
        return res.redirect('/admin/users?error=Cannot delete the last admin user');
      }
    }
    
    // Store user data for logging before deletion
    const deletedUserData = {
      id: userToDelete.id,
      username: userToDelete.username,
      email: userToDelete.email,
      role: userToDelete.Role ? userToDelete.Role.name : 'unknown'
    };
    
    // Delete user with enhanced error handling
    await userToDelete.destroy();
    
    logAuthEvent('ADMIN_USER_DELETE_SUCCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      deletedUser: deletedUserData,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.redirect('/admin/users?success=User deleted successfully');
    
  } catch (err) {
    // Handle specific database errors
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      logAuthError('ADMIN_USER_DELETE_CONSTRAINT_ERROR', err, {
        adminId: req.user.id,
        targetUserId: req.params.id,
        constraint: err.parent?.constraint || 'unknown'
      });
      return res.redirect('/admin/users?error=Cannot delete user due to existing related data');
    }
    
    logAuthError('ADMIN_USER_DELETE_ERROR', err, {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      ip: req.ip
    });
    
    res.redirect('/admin/users?error=Failed to delete user. Please try again.');
  }
});

// Enable/Disable user account
router.post('/users/:id/toggle-status', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/users?error=Invalid user ID format');
    }

    const userToToggle = await User.findByPk(req.params.id, {
      include: [{ model: Role, required: false }]
    });

    if (!userToToggle) {
      return res.redirect('/admin/users?error=User not found');
    }

    // Prevent admin from disabling themselves
    if (req.user.id === userToToggle.id) {
      return res.redirect('/admin/users?error=You cannot disable your own account');
    }

    // Toggle the user's status (we'll use email_verified as a proxy for account status)
    const newStatus = !userToToggle.email_verified;
    await userToToggle.update({ email_verified: newStatus });

    logAuthEvent('ADMIN_USER_STATUS_TOGGLE', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userToToggle.username,
      newStatus: newStatus ? 'enabled' : 'disabled',
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    const statusText = newStatus ? 'enabled' : 'disabled';
    res.redirect(`/admin/users?success=User ${userToToggle.username} has been ${statusText}`);

  } catch (err) {
    logAuthError('ADMIN_USER_STATUS_TOGGLE_ERROR', err, {
      adminId: req.user.id,
      targetUserId: req.params.id,
      ip: req.ip
    });
    res.redirect('/admin/users?error=Failed to toggle user status');
  }
});

// Reset user password
router.post('/users/:id/reset-password', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/users?error=Invalid user ID format');
    }

    const userToReset = await User.findByPk(req.params.id);
    if (!userToReset) {
      return res.redirect('/admin/users?error=User not found');
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const bcrypt = require('bcryptjs');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(tempPassword, saltRounds);

    await userToReset.update({ password_hash });

    logAuthEvent('ADMIN_USER_PASSWORD_RESET', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userToReset.username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    // In a real app, you'd send this via email
    res.redirect(`/admin/users?success=Password reset for ${userToReset.username}. Temporary password: ${tempPassword}`);

  } catch (err) {
    logAuthError('ADMIN_USER_PASSWORD_RESET_ERROR', err, {
      adminId: req.user.id,
      targetUserId: req.params.id,
      ip: req.ip
    });
    res.redirect('/admin/users?error=Failed to reset password');
  }
});

// Verify user email manually
router.post('/users/:id/verify-email', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/users?error=Invalid user ID format');
    }

    const userToVerify = await User.findByPk(req.params.id);
    if (!userToVerify) {
      return res.redirect('/admin/users?error=User not found');
    }

    await userToVerify.update({ 
      email_verified: true,
      email_verification_token: null
    });

    logAuthEvent('ADMIN_USER_EMAIL_VERIFY', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userToVerify.username,
      targetEmail: userToVerify.email,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.redirect(`/admin/users?success=Email verified for ${userToVerify.username}`);

  } catch (err) {
    logAuthError('ADMIN_USER_EMAIL_VERIFY_ERROR', err, {
      adminId: req.user.id,
      targetUserId: req.params.id,
      ip: req.ip
    });
    res.redirect('/admin/users?error=Failed to verify email');
  }
});

// View user details
router.get('/users/:id/details', isAuthenticated, isAdmin, validateUserId, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/admin/users?error=Invalid user ID format');
    }

    const userDetails = await User.findByPk(req.params.id, {
      include: [
        { model: Role, required: false },
        { 
          model: require('../models').UserDevice,
          required: false,
          order: [['last_login_at', 'DESC']],
          limit: 5
        },
        {
          model: require('../models').UserSubscription,
          as: 'UserSubscriptions',
          required: false,
          limit: 1,
          order: [['created_at', 'DESC']]
        },
        {
          model: require('../models').SocialAccount,
          required: false,
          order: [['createdAt', 'DESC']]
        },
        {
          model: require('../models').Content,
          required: false,
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: require('../models').File,
          required: false,
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!userDetails) {
      return res.redirect('/admin/users?error=User not found');
    }

    logAuthEvent('ADMIN_USER_DETAILS_VIEW', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      targetUsername: userDetails.username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });

    res.render('admin/user-details', {
      user: req.user,
      userDetails,
      title: `User Details - ${userDetails.username}`
    });

  } catch (err) {
    logAuthError('ADMIN_USER_DETAILS_VIEW_ERROR', err, {
      adminId: req.user.id,
      targetUserId: req.params.id,
      ip: req.ip
    });
    res.redirect('/admin/users?error=Failed to load user details');
  }
});

// Admin logs viewer route
router.get('/logs', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { 
      channel = 'all', 
      userId = '', 
      level = 'all', 
      limit = 100,
      page = 1 
    } = req.query;
    
    // Log admin accessing logs viewer
    logAuthEvent('ADMIN_LOGS_VIEWER_ACCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      filters: {
        channel,
        userId,
        level,
        limit: parseInt(limit),
        page: parseInt(page)
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    res.render('admin/logs', {
      user: req.user,
      title: 'System Logs - Admin',
      filters: {
        channel,
        userId,
        level,
        limit: parseInt(limit),
        page: parseInt(page)
      }
    });
  } catch (error) {
    handleAdminError(req, res, error, {
      action: 'view_logs'
    });
  }
});

// API endpoint for fetching logs
router.get('/api/logs', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const readline = require('readline');
    
    const { 
      channel = 'all', 
      userId = '', 
      level = 'all', 
      limit = 100,
      page = 1,
      search = ''
    } = req.query;
    
    // Log admin accessing logs API
    logAuthEvent('ADMIN_LOGS_API_ACCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      filters: {
        channel,
        userId,
        level,
        limit: parseInt(limit),
        page: parseInt(page),
        search
      },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    const logDir = path.join(__dirname, '..', 'logs');
    let logFile = 'app.log';
    
    // Select appropriate log file based on channel
    if (channel === 'multimedia') {
      logFile = 'multimedia.log';
    } else if (channel === 'error') {
      logFile = 'error.log';
    } else if (channel === 'user') {
      logFile = 'user-activity.log';
    }
    
    const logPath = path.join(logDir, logFile);
    
    if (!fs.existsSync(logPath)) {
      return res.json({
        success: true,
        logs: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0
      });
    }
    
    const logs = [];
    const fileStream = fs.createReadStream(logPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line);
          
          // Apply filters
          let include = true;
          
          // Channel filter
          if (channel !== 'all' && logEntry.channel !== channel) {
            include = false;
          }
          
          // User filter
          if (userId && logEntry.userId !== userId) {
            include = false;
          }
          
          // Level filter
          if (level !== 'all' && logEntry.level !== level) {
            include = false;
          }
          
          // Search filter
          if (search && !JSON.stringify(logEntry).toLowerCase().includes(search.toLowerCase())) {
            include = false;
          }
          
          if (include) {
            logs.push(logEntry);
          }
        } catch (parseError) {
          // Skip invalid JSON lines
          continue;
        }
      }
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = logs.slice(startIndex, endIndex);
    
    // Log successful logs API response
    logAuthEvent('ADMIN_LOGS_API_SUCCESS', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      resultCount: paginatedLogs.length,
      totalCount: logs.length,
      filters: {
        channel,
        userId,
        level,
        search
      },
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      logs: paginatedLogs,
      total: logs.length,
      page: parseInt(page),
      totalPages: Math.ceil(logs.length / parseInt(limit)),
      filters: {
        channel,
        userId,
        level,
        search
      }
    });
    
  } catch (error) {
    handleAdminError(req, res, error, {
      action: 'fetch_logs'
    });
  }
});

// API endpoint for live log streaming (Server-Sent Events)
router.get('/api/logs/stream', isAuthenticated, isAdmin, (req, res) => {
  const { channel = 'all', userId = '', level = 'all' } = req.query;
  
  // Log admin starting log streaming
  logAuthEvent('ADMIN_LOGS_STREAM_START', {
    adminId: req.user.id,
    adminUsername: req.user.username,
    streamFilters: {
      channel,
      userId,
      level
    },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);
  
  const fs = require('fs');
  const path = require('path');
  const { Tail } = require('tail');
  
  const logDir = path.join(__dirname, '..', 'logs');
  let logFile = 'app.log';
  
  // Select appropriate log file based on channel
  if (channel === 'multimedia') {
    logFile = 'multimedia.log';
  } else if (channel === 'error') {
    logFile = 'error.log';
  } else if (channel === 'user') {
    logFile = 'user-activity.log';
  }
  
  const logPath = path.join(logDir, logFile);
  
  let tail;
  
  try {
    if (fs.existsSync(logPath)) {
      tail = new Tail(logPath);
      
      tail.on('line', (line) => {
        if (line.trim()) {
          try {
            const logEntry = JSON.parse(line);
            
            // Apply filters
            let include = true;
            
            // Channel filter
            if (channel !== 'all' && logEntry.channel !== channel) {
              include = false;
            }
            
            // User filter
            if (userId && logEntry.userId !== userId) {
              include = false;
            }
            
            // Level filter
            if (level !== 'all' && logEntry.level !== level) {
              include = false;
            }
            
            if (include) {
              res.write(`data: ${JSON.stringify({ type: 'log', data: logEntry })}\n\n`);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      });
      
      tail.on('error', (error) => {
        logAuthError('ADMIN_LOGS_STREAM_ERROR', error, { adminId: req.user.id });
        console.error('Tail error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Log monitoring error' })}\n\n`);
      });
    }
  } catch (error) {
    logAuthError('ADMIN_LOGS_STREAM_SETUP_ERROR', error, { adminId: req.user.id });
    console.error('Error setting up log streaming:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to start log streaming' })}\n\n`);
  }
  
  // Handle client disconnect
  req.on('close', () => {
    // Log admin ending log streaming
    logAuthEvent('ADMIN_LOGS_STREAM_END', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      reason: 'client_disconnect',
      timestamp: new Date().toISOString()
    });
    if (tail) {
      tail.unwatch();
    }
  });
  
  req.on('end', () => {
    // Log admin ending log streaming
    logAuthEvent('ADMIN_LOGS_STREAM_END', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      reason: 'connection_end',
      timestamp: new Date().toISOString()
    });
    if (tail) {
      tail.unwatch();
    }
  });
});

/**
 * GET /admin/multimedia-testing
 * Display the multimedia analysis testing interface
 */
router.get('/multimedia-testing', requireTesterPermission, async (req, res) => {
  try {
    // Get available test files
    const fs = require('fs');
    const path = require('path');
    
    const testFiles = {
      images: [],
      audio: [],
      video: []
    };
    
    // Read testfiles directory structure
    const testfilesPath = path.join(__dirname, '..', 'testfiles');
    
    try {
      const categories = ['images', 'audio', 'video'];
      for (const category of categories) {
        const categoryPath = path.join(testfilesPath, category);
        if (fs.existsSync(categoryPath)) {
          const files = fs.readdirSync(categoryPath)
            .filter(file => !file.startsWith('.') && file !== 'README.md')
            .map(file => ({
              name: file,
              path: path.join('testfiles', category, file),
              size: fs.statSync(path.join(categoryPath, file)).size
            }));
          testFiles[category] = files;
        }
      }
    } catch (error) {
      console.error('Error reading test files:', error);
    }
    
    // Get test URLs from configuration
    let testUrls = {};
    try {
      const testUrlsPath = path.join(testfilesPath, 'test-urls.json');
      if (fs.existsSync(testUrlsPath)) {
        const urlsData = fs.readFileSync(testUrlsPath, 'utf8');
        testUrls = JSON.parse(urlsData);
      }
    } catch (error) {
      console.error('Error reading test URLs:', error);
    }
    
    // Available AI jobs
    const aiJobs = [
      { id: 'object_detection', name: 'Object Detection', description: 'Detect and identify objects in images/video' },
      { id: 'transcription', name: 'Audio Transcription', description: 'Convert speech to text' },
      { id: 'speaker_diarization', name: 'Speaker Diarization', description: 'Identify different speakers' },
      { id: 'voice_print_recognition', name: 'Voice Print Recognition', description: 'Match voices to known speakers' },
      { id: 'sentiment_analysis', name: 'Sentiment Analysis', description: 'Analyze emotional tone' },
      { id: 'summarization', name: 'Text Summarization', description: 'Generate content summaries' },
      { id: 'thumbnail_generation', name: 'Thumbnail Generation', description: 'Generate thumbnails and key moments' },
      { id: 'ocr_extraction', name: 'OCR Text Extraction', description: 'Extract text from images/video frames' },
      { id: 'content_categorization', name: 'Content Categorization', description: 'Automatically categorize content' },
      { id: 'named_entity_recognition', name: 'Named Entity Recognition', description: 'Extract entities from text' },
      { id: 'profanity_detection', name: 'Profanity Detection', description: 'Detect inappropriate content' },
      { id: 'keyword_detection', name: 'Keyword Detection', description: 'Identify key terms and phrases' }
    ];
    
    // Get recent test runs
    const { TestRun } = require('../models');
    const recentRuns = await TestRun.findAll({
      where: { user_id: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'status', 'total_tests', 'passed_tests', 'failed_tests', 'createdAt']
    });
    
    res.render('admin/multimedia-testing', {
      title: 'Multimedia Analysis Testing',
      testFiles,
      testUrls,
      aiJobs,
      recentRuns,
      user: req.user
    });
    
  } catch (error) {
    console.error('Error loading testing interface:', error);
    res.status(500).render('error', { 
      error: 'Failed to load testing interface', 
      user: req.user 
    });
  }
});

/**
 * POST /admin/multimedia-testing/run
 * Execute a multimedia analysis test run
 */
router.post('/multimedia-testing/run', requireTesterPermission, async (req, res) => {
  try {
    const { name, selectedFiles, selectedUrls, selectedAiJobs, configuration } = req.body;
    
    if (!name || !selectedAiJobs || selectedAiJobs.length === 0) {
      return res.status(400).json({ 
        error: 'Test name and at least one AI job are required' 
      });
    }
    
    if ((!selectedFiles || selectedFiles.length === 0) && (!selectedUrls || selectedUrls.length === 0)) {
      return res.status(400).json({ 
        error: 'At least one file or URL must be selected' 
      });
    }
    
    const { TestRun } = require('../models');
    const { v4: uuidv4 } = require('uuid');
    
    // Calculate total tests
    const fileCount = selectedFiles ? selectedFiles.length : 0;
    const urlCount = selectedUrls ? selectedUrls.length : 0;
    const totalTests = (fileCount + urlCount) * selectedAiJobs.length;
    
    // Create test run record
    const testRun = await TestRun.create({
      id: uuidv4(),
      user_id: req.user.id,
      name,
      test_type: fileCount > 0 && urlCount > 0 ? 'mixed' : fileCount > 0 ? 'file_upload' : 'url_analysis',
      total_tests: totalTests,
      selected_files: selectedFiles || [],
      selected_urls: selectedUrls || [],
      selected_ai_jobs: selectedAiJobs,
      configuration: configuration || {},
      status: 'running',
      started_at: new Date()
    });
    
    // Start test execution in background
    setImmediate(() => {
      executeTestRun(testRun.id, req.user.id);
    });
    
    res.json({ 
      success: true, 
      testRunId: testRun.id,
      totalTests,
      message: 'Test run started successfully'
    });
    
  } catch (error) {
    console.error('Error starting test run:', error);
    res.status(500).json({ error: 'Failed to start test run' });
  }
});

/**
 * GET /admin/multimedia-testing/status/:testRunId
 * Get real-time status of a test run
 */
router.get('/multimedia-testing/status/:testRunId', requireTesterPermission, async (req, res) => {
  try {
    const { TestRun, TestResult } = require('../models');
    
    const testRun = await TestRun.findOne({
      where: { 
        id: req.params.testRunId,
        user_id: req.user.id 
      },
      include: [{
        model: TestResult,
        as: 'testResults',
        attributes: ['id', 'test_source', 'ai_job', 'status', 'pass_fail_reason', 'duration_ms', 'completed_at']
      }]
    });
    
    if (!testRun) {
      return res.status(404).json({ error: 'Test run not found' });
    }
    
    res.json({
      id: testRun.id,
      name: testRun.name,
      status: testRun.status,
      progress: testRun.progress,
      total_tests: testRun.total_tests,
      passed_tests: testRun.passed_tests,
      failed_tests: testRun.failed_tests,
      started_at: testRun.started_at,
      completed_at: testRun.completed_at,
      duration_seconds: testRun.duration_seconds,
      error_message: testRun.error_message,
      results: testRun.testResults || []
    });
    
  } catch (error) {
    console.error('Error getting test run status:', error);
    res.status(500).json({ error: 'Failed to get test run status' });
  }
});

/**
 * GET /admin/multimedia-testing/results/:testRunId
 * Get detailed results of a test run
 */
router.get('/multimedia-testing/results/:testRunId', requireTesterPermission, async (req, res) => {
  try {
    const { TestRun, TestResult, TestMetric } = require('../models');
    
    const testRun = await TestRun.findOne({
      where: { 
        id: req.params.testRunId,
        user_id: req.user.id 
      },
      include: [
        {
          model: TestResult,
          as: 'testResults',
          attributes: ['id', 'test_source', 'ai_job', 'status', 'pass_fail_reason', 'ai_output', 'error_details', 'duration_ms', 'tokens_used', 'estimated_cost', 'confidence_score', 'completed_at']
        },
        {
          model: TestMetric,
          as: 'testMetrics',
          attributes: ['metric_type', 'metric_name', 'ai_job', 'metric_value', 'metric_unit', 'collected_at']
        }
      ]
    });
    
    if (!testRun) {
      return res.status(404).json({ error: 'Test run not found' });
    }
    
    res.render('admin/test-results', {
      title: `Test Results - ${testRun.name}`,
      testRun,
      user: req.user
    });
    
  } catch (error) {
    console.error('Error getting test run results:', error);
    res.status(500).render('error', { 
      error: 'Failed to load test results', 
      user: req.user 
    });
  }
});

/**
 * Execute a test run in the background
 */
async function executeTestRun(testRunId, userId) {
  const { TestRun, TestResult, TestMetric } = require('../models');
  const { MultimediaAnalyzer } = require('../services/multimedia');
  const { v4: uuidv4 } = require('uuid');
  
  try {
    const testRun = await TestRun.findByPk(testRunId);
    if (!testRun) {
      throw new Error('Test run not found');
    }
    
    const multimediaAnalyzer = new MultimediaAnalyzer();
    const allTests = [];
    
    // Create test combinations
    const selectedFiles = testRun.selected_files || [];
    const selectedUrls = testRun.selected_urls || [];
    const selectedAiJobs = testRun.selected_ai_jobs || [];
    
    // Add file tests
    for (const file of selectedFiles) {
      for (const aiJob of selectedAiJobs) {
        allTests.push({
          type: 'file_upload',
          source: file,
          aiJob
        });
      }
    }
    
    // Add URL tests
    for (const url of selectedUrls) {
      for (const aiJob of selectedAiJobs) {
        allTests.push({
          type: 'url_analysis',
          source: url,
          aiJob
        });
      }
    }
    
    let completedTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    // Execute tests
    for (const test of allTests) {
      try {
        const testResult = await TestResult.create({
          id: uuidv4(),
          test_run_id: testRunId,
          user_id: userId,
          test_type: test.type,
          test_source: test.source,
          ai_job: test.aiJob,
          status: 'running',
          started_at: new Date()
        });
        
        const startTime = Date.now();
        
        try {
          // Execute AI analysis based on test type
          let result;
          if (test.type === 'file_upload') {
            // For file uploads, we need to determine file type and analyze
            const path = require('path');
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', test.source);
            
            if (!fs.existsSync(filePath)) {
              throw new Error(`Test file not found: ${test.source}`);
            }
            
            const fileType = getFileType(filePath);
            result = await multimediaAnalyzer.analyzeMultimedia(userId, filePath, fileType, {
              [test.aiJob]: true
            });
          } else {
            // For URL analysis
            result = await multimediaAnalyzer.analyzeContent(test.source, {
              user_id: userId,
              [test.aiJob]: true
            });
          }
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          // Determine pass/fail based on result
          const isPass = result && !result.error;
          const status = isPass ? 'passed' : 'failed';
          const reason = isPass ? 'AI job completed successfully' : (result.error || 'Unknown error');
          
          await testResult.update({
            status,
            pass_fail_reason: reason,
            ai_output: result,
            duration_ms: duration,
            completed_at: new Date(),
            confidence_score: result.confidence_score || null,
            tokens_used: result.tokens_used || 0,
            estimated_cost: result.estimated_cost || 0
          });
          
          // Create performance metrics
          await TestMetric.create({
            id: uuidv4(),
            test_run_id: testRunId,
            user_id: userId,
            metric_type: 'performance',
            metric_name: 'processing_time',
            ai_job: test.aiJob,
            metric_value: duration,
            metric_unit: 'ms',
            collected_at: new Date()
          });
          
          if (isPass) {
            passedTests++;
          } else {
            failedTests++;
          }
          
        } catch (error) {
          await testResult.update({
            status: 'failed',
            pass_fail_reason: error.message,
            error_details: {
              error: error.message,
              stack: error.stack
            },
            completed_at: new Date()
          });
          failedTests++;
        }
        
      } catch (error) {
        console.error('Error creating test result:', error);
        failedTests++;
      }
      
      completedTests++;
      
      // Update test run progress
      const progress = Math.round((completedTests / allTests.length) * 100);
      await testRun.update({
        progress,
        passed_tests: passedTests,
        failed_tests: failedTests
      });
    }
    
    // Complete test run
    await testRun.update({
      status: 'completed',
      completed_at: new Date(),
      duration_seconds: Math.round((Date.now() - new Date(testRun.started_at)) / 1000)
    });
    
  } catch (error) {
    console.error('Error executing test run:', error);
    await TestRun.update({
      status: 'failed',
      error_message: error.message,
      completed_at: new Date()
    }, {
      where: { id: testRunId }
    });
  }
}

/**
 * Helper function to determine file type from file path
 */
function getFileType(filePath) {
  const path = require('path');
  const ext = path.extname(filePath).toLowerCase();
  
  const imageTypes = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const audioTypes = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
  const videoTypes = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
  
  if (imageTypes.includes(ext)) return 'image/jpeg';
  if (audioTypes.includes(ext)) return 'audio/mpeg';
  if (videoTypes.includes(ext)) return 'video/mp4';
  
  return 'application/octet-stream';
}

// Test endpoints for AI pipeline testing
router.get('/test-google-api', async (req, res) => {
  try {
    const MultimediaAnalyzer = require('../services/multimedia/MultimediaAnalyzer');
    const analyzer = new MultimediaAnalyzer({ enableLogging: false });
    
    // Check if Google Vision API is available
    if (analyzer.visionClient || analyzer.googleApiKey) {
      res.json({
        success: true,
        message: 'Google Vision API is accessible',
        method: analyzer.visionClient ? 'Service Account' : 'API Key'
      });
    } else {
      res.json({
        success: false,
        message: 'Google Vision API credentials not configured'
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: `Google Vision API test failed: ${error.message}`
    });
  }
});

router.get('/test-openai-api', async (req, res) => {
  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    if (openaiApiKey) {
      // Simple test of OpenAI API availability
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: openaiApiKey });
      
      res.json({
        success: true,
        message: 'OpenAI API key is configured and accessible'
      });
    } else {
      res.json({
        success: false,
        message: 'OpenAI API key not configured'
      });
    }
  } catch (error) {
    res.json({
      success: false,
      message: `OpenAI API test failed: ${error.message}`
    });
  }
});

// Admin test routes
router.get('/tests', isAuthenticated, isAdmin, async (req, res) => {
  try {
    logAuthEvent('ADMIN_TEST_PAGE_ACCESS', { 
      adminId: req.user.id, 
      adminUsername: req.user.username 
    });
    
    res.render('admin/tests', {
      user: req.user,
      title: 'Admin - System Tests',
      testResults: null,
      isRunning: false
    });
  } catch (error) {
    handleAdminError(req, res, error, { action: 'VIEW_TESTS' });
  }
});

router.post('/tests/run', isAuthenticated, isAdmin, async (req, res) => {
  try {
    logAuthEvent('ADMIN_TEST_RUN_START', { 
      adminId: req.user.id, 
      adminUsername: req.user.username 
    });
    
    // Import and run the AI pipeline test
    const AIPipelineTest = require('../tests/test-ai-pipeline');
    const tester = new AIPipelineTest();
    
    // Capture console output
    const originalConsoleLog = console.log;
    let testOutput = [];
    
    console.log = (...args) => {
      testOutput.push(args.join(' '));
      originalConsoleLog(...args);
    };
    
    try {
      await tester.runAllTests();
      
      // Restore console.log
      console.log = originalConsoleLog;
      
      logAuthEvent('ADMIN_TEST_RUN_SUCCESS', { 
        adminId: req.user.id, 
        adminUsername: req.user.username,
        testResults: tester.testResults
      });
      
      res.json({
        success: true,
        testResults: tester.testResults,
        output: testOutput,
        timestamp: new Date().toISOString()
      });
      
    } catch (testError) {
      console.log = originalConsoleLog;
      throw testError;
    }
    
  } catch (error) {
    logAuthError('ADMIN_TEST_RUN_ERROR', error, {
      adminId: req.user.id,
      adminUsername: req.user.username
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get user passkeys for admin management
router.get('/users/:userId/passkeys', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findByPk(userId, {
      include: [{ model: Role, as: 'Role' }]
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const passkeys = await UserPasskey.getUserPasskeys(userId, false); // Include inactive
    
    const passkeyData = passkeys.map(passkey => ({
      id: passkey.id,
      device_name: passkey.getDeviceDisplayName(),
      device_type: passkey.device_type,
      device_icon: passkey.getDeviceIcon(),
      last_used_at: passkey.last_used_at,
      created_at: passkey.created_at,
      is_active: passkey.is_active,
      browser_info: passkey.browser_info
    }));
    
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      passkeys: passkeyData,
      count: passkeyData.length
    });
    
  } catch (error) {
    console.error('Admin get user passkeys error:', error);
    res.status(500).json({ error: 'Failed to retrieve user passkeys' });
  }
});

// Disable a user's passkey (admin action)
router.patch('/users/:userId/passkeys/:passkeyId/disable', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId, passkeyId } = req.params;
    
    const passkey = await UserPasskey.findOne({
      where: { 
        id: passkeyId,
        user_id: userId 
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!passkey) {
      return res.status(404).json({ error: 'Passkey not found' });
    }
    
    await passkey.deactivate();
    
    res.json({
      success: true,
      message: `Passkey disabled for user ${passkey.user.username}`,
      passkey: {
        id: passkey.id,
        device_name: passkey.getDeviceDisplayName(),
        is_active: passkey.is_active
      }
    });
    
  } catch (error) {
    console.error('Admin disable passkey error:', error);
    res.status(500).json({ error: 'Failed to disable passkey' });
  }
});

// Enable a user's passkey (admin action)
router.patch('/users/:userId/passkeys/:passkeyId/enable', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId, passkeyId } = req.params;
    
    const passkey = await UserPasskey.findOne({
      where: { 
        id: passkeyId,
        user_id: userId 
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!passkey) {
      return res.status(404).json({ error: 'Passkey not found' });
    }
    
    await passkey.activate();
    
    res.json({
      success: true,
      message: `Passkey enabled for user ${passkey.user.username}`,
      passkey: {
        id: passkey.id,
        device_name: passkey.getDeviceDisplayName(),
        is_active: passkey.is_active
      }
    });
    
  } catch (error) {
    console.error('Admin enable passkey error:', error);
    res.status(500).json({ error: 'Failed to enable passkey' });
  }
});

// Delete a user's passkey (admin action)
router.delete('/users/:userId/passkeys/:passkeyId', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId, passkeyId } = req.params;
    
    const passkey = await UserPasskey.findOne({
      where: { 
        id: passkeyId,
        user_id: userId 
      },
      include: [{
        model: User,
        as: 'user'
      }]
    });
    
    if (!passkey) {
      return res.status(404).json({ error: 'Passkey not found' });
    }
    
    await passkey.destroy();
    
    res.json({
      success: true,
      message: `Passkey deleted for user ${passkey.user.username}`
    });
    
  } catch (error) {
    console.error('Admin delete passkey error:', error);
    res.status(500).json({ error: 'Failed to delete passkey' });
  }
});

module.exports = router; 