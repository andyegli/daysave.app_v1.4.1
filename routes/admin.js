const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
const { logAuthEvent, logAuthError } = require('../config/logger');
const { isAuthenticated } = require('../middleware');
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

// Enhanced admin check middleware with better error handling
async function isAdmin(req, res, next) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      logAuthEvent('ADMIN_ACCESS_DENIED', {
        userId: req.user?.id || null,
        username: req.user?.username || null,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        reason: 'not_authenticated',
        requestPath: req.path,
        timestamp: new Date().toISOString()
      });
      return res.status(403).render('error', {
        user: req.user,
        title: 'Access Denied',
        message: 'You need administrator privileges to access this page.'
      });
    }
    
    // Use the role loaded by ensureRoleLoaded middleware
    if (!req.user.Role) {
      logAuthEvent('ADMIN_ACCESS_DENIED', {
        userId: req.user.id,
        username: req.user.username,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        reason: 'role_not_found',
        requestPath: req.path,
        timestamp: new Date().toISOString()
      });
      return res.status(403).render('error', {
        user: req.user,
        title: 'Role Error',
        message: 'Your user role could not be verified. Please contact support.'
      });
    }
    
    if (req.user.Role.name === 'admin') {
      req.user.roleName = req.user.Role.name; // For backward compatibility
      logAuthEvent('ADMIN_ACCESS_GRANTED', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestPath: req.path,
        timestamp: new Date().toISOString()
      });
      return next();
    }
    
    logAuthEvent('ADMIN_ACCESS_DENIED', {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.Role.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      reason: 'insufficient_role',
      requestPath: req.path,
      timestamp: new Date().toISOString()
    });
    
    return res.status(403).render('error', {
      user: req.user,
      title: 'Insufficient Privileges',
      message: 'You need administrator privileges to access this page.'
    });
    
  } catch (err) {
    logAuthError('ADMIN_ROLE_CHECK_ERROR', err, {
      userId: req.user?.id || null,
      username: req.user?.username || null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      requestPath: req.path
    });
    
    return res.status(500).render('error', {
      user: req.user,
      title: 'Authentication Error',
      message: 'Unable to verify your permissions. Please try again.'
    });
  }
}

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
      include: [{
        model: Role,
        required: false // Use LEFT JOIN to handle users without roles
      }],
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

module.exports = router; 