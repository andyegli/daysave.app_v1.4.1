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
      contacts = await Contact.findAll({ order: [['name', 'ASC']] });
    } else {
      contacts = await Contact.findAll({ where: { user_id: req.user.id }, order: [['name', 'ASC']] });
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
  const { name } = req.body;
  // Parse emails, phones, addresses, notes, social_profiles as arrays of objects
  const emails = Array.isArray(req.body.emails) ? req.body.emails : Object.values(req.body.emails || {});
  const phones = Array.isArray(req.body.phones) ? req.body.phones : Object.values(req.body.phones || {});
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : Object.values(req.body.addresses || {});
  const notes = Array.isArray(req.body.notes) ? req.body.notes : Object.values(req.body.notes || {});
  const social_profiles = Array.isArray(req.body.social_profiles) ? req.body.social_profiles : Object.values(req.body.social_profiles || {});
  const parsedEmails = emails.map(e => ({ label: e.label, value: e.value })).filter(e => e.value);
  const parsedPhones = phones.map(p => ({ label: p.label, value: p.value })).filter(p => p.value);
  const parsedAddresses = addresses.map(a => ({ label: a.label, value: a.value })).filter(a => a.value);
  const parsedNotes = notes.map(n => ({ label: n.label, value: n.value })).filter(n => n.value);
  const parsedSocials = social_profiles.map(s => ({ label: s.label, value: s.value })).filter(s => s.value);
  if (!name) {
    return res.render('contacts/form', { user: req.user, contact: req.body, formAction: '/contacts', method: 'POST', error: 'Name is required.', success: null });
  }
  try {
    await Contact.create({
      user_id: req.user.id,
      name,
      emails: parsedEmails,
      phones: parsedPhones,
      addresses: parsedAddresses,
      notes: parsedNotes,
      social_profiles: parsedSocials
    });
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
  const { name } = req.body;
  const emails = Array.isArray(req.body.emails) ? req.body.emails : Object.values(req.body.emails || {});
  const phones = Array.isArray(req.body.phones) ? req.body.phones : Object.values(req.body.phones || {});
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : Object.values(req.body.addresses || {});
  const notes = Array.isArray(req.body.notes) ? req.body.notes : Object.values(req.body.notes || {});
  const social_profiles = Array.isArray(req.body.social_profiles) ? req.body.social_profiles : Object.values(req.body.social_profiles || {});
  const parsedEmails = emails.map(e => ({ label: e.label, value: e.value })).filter(e => e.value);
  const parsedPhones = phones.map(p => ({ label: p.label, value: p.value })).filter(p => p.value);
  const parsedAddresses = addresses.map(a => ({ label: a.label, value: a.value })).filter(a => a.value);
  const parsedNotes = notes.map(n => ({ label: n.label, value: n.value })).filter(n => n.value);
  const parsedSocials = social_profiles.map(s => ({ label: s.label, value: s.value })).filter(s => s.value);
  try {
    const contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    contact.name = name;
    contact.emails = parsedEmails;
    contact.phones = parsedPhones;
    contact.addresses = parsedAddresses;
    contact.notes = parsedNotes;
    contact.social_profiles = parsedSocials;
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