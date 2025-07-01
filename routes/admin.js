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
    const users = await User.findAll({ include: [Role] });
    logAuthEvent('ADMIN_USER_LIST', { adminId: req.user.id });
    res.render('admin/user-list', { users, user: req.user, error: req.query.error, success: req.query.success });
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

module.exports = router; 