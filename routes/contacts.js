const express = require('express');
const router = express.Router();
const { Contact, Role } = require('../models');
const { isAuthenticated } = require('../middleware');

// List contacts
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Ensure role is available
    if (!req.user.role || !req.user.role.name) {
      const userRole = await Role.findByPk(req.user.role_id);
      req.user.role = userRole;
    }
    let contacts;
    if (req.user.role && req.user.role.name === 'admin') {
      contacts = await Contact.findAll({ order: [['first_name', 'ASC'], ['last_name', 'ASC']] });
    } else {
      contacts = await Contact.findAll({ where: { user_id: req.user.id }, order: [['first_name', 'ASC'], ['last_name', 'ASC']] });
    }
    res.render('contacts/list', { user: req.user, contacts, error: null, success: req.query.success || null });
  } catch (err) {
    res.render('contacts/list', { user: req.user, contacts: [], error: 'Failed to load contacts.', success: null });
  }
});

// New contact form
router.get('/new', isAuthenticated, (req, res) => {
  res.render('contacts/form', { user: req.user, contact: {}, formAction: '/contacts', method: 'POST', error: null, success: null });
});

// Create contact
router.post('/', isAuthenticated, async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;
  if (!first_name || !last_name) {
    return res.render('contacts/form', { user: req.user, contact: req.body, formAction: '/contacts', method: 'POST', error: 'First and last name are required.', success: null });
  }
  try {
    await Contact.create({ user_id: req.user.id, first_name, last_name, email, phone });
    res.redirect('/contacts?success=Contact created');
  } catch (err) {
    res.render('contacts/form', { user: req.user, contact: req.body, formAction: '/contacts', method: 'POST', error: 'Failed to create contact.', success: null });
  }
});

// Edit contact form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    res.render('contacts/form', { user: req.user, contact, formAction: `/contacts/${contact.id}`, method: 'POST', error: null, success: null });
  } catch (err) {
    res.redirect('/contacts?error=Failed to load contact');
  }
});

// Update contact
router.post('/:id', isAuthenticated, async (req, res) => {
  const { first_name, last_name, email, phone } = req.body;
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    contact.first_name = first_name;
    contact.last_name = last_name;
    contact.email = email;
    contact.phone = phone;
    await contact.save();
    res.redirect('/contacts?success=Contact updated');
  } catch (err) {
    res.render('contacts/form', { user: req.user, contact: { id: req.params.id, ...req.body }, formAction: `/contacts/${req.params.id}`, method: 'POST', error: 'Failed to update contact.', success: null });
  }
});

// Delete contact
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    await contact.destroy();
    res.redirect('/contacts?success=Contact deleted');
  } catch (err) {
    res.redirect('/contacts?error=Failed to delete contact');
  }
});

module.exports = router; 