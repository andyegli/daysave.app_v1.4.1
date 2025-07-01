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
  // TODO: Pagination, search, etc.
  try {
    const users = await User.findAll({ include: [Role] });
    logAuthEvent('ADMIN_USER_LIST', { adminId: req.user.id });
    res.render('admin/user-list', { users, user: req.user });
  } catch (err) {
    logAuthError('ADMIN_USER_LIST_ERROR', err, { adminId: req.user.id });
    res.status(500).render('error', { title: 'Error', message: 'Failed to load users.' });
  }
});

// Create user (form)
router.get('/users/new', isAuthenticated, isAdmin, (req, res) => {
  res.render('admin/user-form', { user: req.user, formAction: '/admin/users', method: 'POST', userData: {} });
});

// Create user (POST)
router.post('/users', isAuthenticated, isAdmin, async (req, res) => {
  // TODO: Validate and create user
  res.redirect('/admin/users');
});

// Edit user (form)
router.get('/users/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
  // TODO: Fetch user and render form
  res.render('admin/user-form', { user: req.user, formAction: `/admin/users/${req.params.id}`, method: 'POST', userData: {} });
});

// Update user (POST)
router.post('/users/:id', isAuthenticated, isAdmin, async (req, res) => {
  // TODO: Validate and update user
  res.redirect('/admin/users');
});

// Delete user
router.post('/users/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
  // TODO: Delete user and all related data
  res.redirect('/admin/users');
});

module.exports = router; 