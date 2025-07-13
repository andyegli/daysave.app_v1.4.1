const express = require('express');
const router = express.Router();
const { User, Role } = require('../models');
const { logAuthEvent, logAuthError } = require('../config/logger');
const { isAuthenticated } = require('../middleware');

// Placeholder admin check middleware
async function isAdmin(req, res, next) {
  if (!req.isAuthenticated() || !req.user || !req.user.role_id) {
    return res.status(403).render('error', { title: 'Forbidden', message: 'Admins only.' });
  }
  try {
    // Fetch the user's role
    const role = await Role.findByPk(req.user.role_id);
    if (role && role.name === 'admin') {
      req.user.roleName = role.name; // Attach for views
      return next();
    }
    return res.status(403).render('error', { title: 'Forbidden', message: 'Admins only.' });
  } catch (err) {
    return res.status(500).render('error', { title: 'Error', message: 'Role check failed.' });
  }
}

// List users
router.get('/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    const where = search
      ? {
          [require('sequelize').Op.or]: [
            { username: { [require('sequelize').Op.iLike]: `%${search}%` } },
            { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
          ]
        }
      : {};
    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [Role],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });
    const totalPages = Math.ceil(count / limit) || 1;
    logAuthEvent('ADMIN_USER_LIST', { adminId: req.user.id, page, search });
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
    logAuthError('ADMIN_USER_LIST_ERROR', err, { adminId: req.user.id });
    res.status(500).render('error', { title: 'Error', message: 'Failed to load users.' });
  }
});

// Create user (form)
router.get('/users/new', isAuthenticated, isAdmin, async (req, res) => {
  const roles = await Role.findAll();
  res.render('admin/user-form', { user: req.user, formAction: '/admin/users', method: 'POST', userData: {}, roles, error: null, success: null });
});

// Create user (POST)
router.post('/users', isAuthenticated, isAdmin, async (req, res) => {
  const { username, email, role_id, password, confirmPassword } = req.body;
  const roles = await Role.findAll();
  let error = null;
  if (!username || !email || !role_id || !password || password !== confirmPassword) {
    error = 'All fields are required and passwords must match.';
    return res.render('admin/user-form', { user: req.user, formAction: '/admin/users', method: 'POST', userData: req.body, roles, error, success: null });
  }
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      error = 'Email already in use.';
      return res.render('admin/user-form', { user: req.user, formAction: '/admin/users', method: 'POST', userData: req.body, roles, error, success: null });
    }
    const bcrypt = require('bcryptjs');
    const password_hash = await bcrypt.hash(password, 10);
    await User.create({ username, email, role_id, password_hash });
    logAuthEvent('ADMIN_USER_CREATE', { adminId: req.user.id, username, email });
    res.redirect('/admin/users?success=User created');
  } catch (err) {
    logAuthError('ADMIN_USER_CREATE_ERROR', err, { adminId: req.user.id });
    res.render('admin/user-form', { user: req.user, formAction: '/admin/users', method: 'POST', userData: req.body, roles, error: 'Failed to create user.', success: null });
  }
});

// Edit user (form)
router.get('/users/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userData = await User.findByPk(req.params.id);
    const roles = await Role.findAll();
    if (!userData) return res.redirect('/admin/users?error=User not found');
    res.render('admin/user-form', { user: req.user, formAction: `/admin/users/${req.params.id}`, method: 'POST', userData, roles, error: null, success: null });
  } catch (err) {
    res.redirect('/admin/users?error=Failed to load user');
  }
});

// Update user (POST)
router.post('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  const { username, email, role_id, password, confirmPassword } = req.body;
  const roles = await Role.findAll();
  try {
    const userToUpdate = await User.findByPk(req.params.id);
    if (!userToUpdate) return res.redirect('/admin/users?error=User not found');
    userToUpdate.username = username;
    userToUpdate.email = email;
    userToUpdate.role_id = role_id;
    if (password) {
      if (password !== confirmPassword) {
        return res.render('admin/user-form', { user: req.user, formAction: `/admin/users/${req.params.id}`, method: 'POST', userData: req.body, roles, error: 'Passwords do not match.', success: null });
      }
      const bcrypt = require('bcryptjs');
      userToUpdate.password_hash = await bcrypt.hash(password, 10);
    }
    await userToUpdate.save();
    logAuthEvent('ADMIN_USER_UPDATE', { adminId: req.user.id, userId: req.params.id });
    res.redirect('/admin/users?success=User updated');
  } catch (err) {
    logAuthError('ADMIN_USER_UPDATE_ERROR', err, { adminId: req.user.id });
    res.render('admin/user-form', { user: req.user, formAction: `/admin/users/${req.params.id}`, method: 'POST', userData: req.body, roles, error: 'Failed to update user.', success: null });
  }
});

// Delete user
router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const userToDelete = await User.findByPk(req.params.id);
    if (!userToDelete) return res.redirect('/admin/users?error=User not found');
    // Delete all related data (cascade or manual)
    await Promise.all([
      userToDelete.destroy()
      // TODO: Add manual deletion for related models if not cascaded
    ]);
    logAuthEvent('ADMIN_USER_DELETE', { adminId: req.user.id, userId: req.params.id });
    res.redirect('/admin/users?success=User deleted');
  } catch (err) {
    logAuthError('ADMIN_USER_DELETE_ERROR', err, { adminId: req.user.id });
    res.redirect('/admin/users?error=Failed to delete user');
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
    console.error('Error loading admin logs page:', error);
    res.status(500).render('error', { 
      user: req.user, 
      title: 'Error', 
      message: 'Failed to load logs page' 
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
    console.error('Error fetching logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

// API endpoint for live log streaming (Server-Sent Events)
router.get('/api/logs/stream', isAuthenticated, isAdmin, (req, res) => {
  const { channel = 'all', userId = '', level = 'all' } = req.query;
  
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
        console.error('Tail error:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Log monitoring error' })}\n\n`);
      });
    }
  } catch (error) {
    console.error('Error setting up log streaming:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to start log streaming' })}\n\n`);
  }
  
  // Handle client disconnect
  req.on('close', () => {
    if (tail) {
      tail.unwatch();
    }
  });
  
  req.on('end', () => {
    if (tail) {
      tail.unwatch();
    }
  });
});

module.exports = router; 