const express = require('express');
const router = express.Router();
const { Contact, Role, User } = require('../models');
const { isAuthenticated } = require('../middleware');

// List contacts
router.get('/', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.role || !req.user.role.name) {
      const userRole = await Role.findByPk(req.user.role_id);
      req.user.role = userRole;
    }
    let contacts, owners = [];
    let ownerFilter = req.query.owner_id || '';
    if (req.user.role && req.user.role.name === 'admin') {
      // Get all owners (users who have contacts)
      owners = await User.findAll({
        include: [{ model: Contact, attributes: [] }],
        attributes: ['id', 'username', 'email', 'first_name', 'last_name'],
        group: ['User.id']
      });
      // Filter contacts by owner if filter is set
      const where = ownerFilter ? { user_id: ownerFilter } : {};
      contacts = await Contact.findAll({
        where,
        include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }],
        order: [['name', 'ASC']]
      });
    } else {
      contacts = await Contact.findAll({
        where: { user_id: req.user.id },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }],
        order: [['name', 'ASC']]
      });
    }
    res.render('contacts/list', { user: req.user, contacts, owners, ownerFilter, error: null, success: req.query.success || null });
  } catch (err) {
    res.render('contacts/list', { user: req.user, contacts: [], owners: [], ownerFilter: '', error: 'Failed to load contacts.', success: null });
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
    let contact;
    if (req.user.role && req.user.role.name === 'admin') {
      contact = await Contact.findOne({ where: { id: req.params.id }, include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }] });
    } else {
      contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }] });
    }
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
    let contact;
    if (req.user.role && req.user.role.name === 'admin') {
      contact = await Contact.findOne({ where: { id: req.params.id }, include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }] });
    } else {
      contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id }, include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }] });
    }
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
    let contact;
    if (req.user.role && req.user.role.name === 'admin') {
      contact = await Contact.findOne({ where: { id: req.params.id } });
    } else {
      contact = await Contact.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    }
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    await contact.destroy();
    res.redirect('/contacts?success=Contact deleted');
  } catch (err) {
    res.redirect('/contacts?error=Failed to delete contact');
  }
});

// Server-side search endpoint
router.get('/search', isAuthenticated, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);
  const advanced = {};
  // Parse advanced queries (e.g., email:john)
  q.split(/\s+/).forEach(token => {
    const match = token.match(/^(name|email|phone|address|note|social|owner):(.+)$/);
    if (match) advanced[match[1]] = match[2];
  });
  let where = {};
  let include = [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }];
  if (!(req.user.role && req.user.role.name === 'admin')) {
    where.user_id = req.user.id;
  }
  let contacts = await Contact.findAll({ where, include });
  // Filter in JS for all fields (for simplicity)
  const filterContact = contact => {
    const owner = contact.User ? `${contact.User.first_name || ''} ${contact.User.last_name || ''} ${contact.User.username || ''} ${contact.User.email || ''}`.toLowerCase() : '';
    const fields = [
      contact.name,
      JSON.stringify(contact.emails),
      JSON.stringify(contact.phones),
      JSON.stringify(contact.addresses),
      JSON.stringify(contact.notes),
      JSON.stringify(contact.social_profiles),
      owner
    ].join(' ').toLowerCase();
    // Advanced field-specific
    for (const key in advanced) {
      if (key === 'owner' && !owner.includes(advanced[key].toLowerCase())) return false;
      if (['name','email','phone','address','note','social'].includes(key)) {
        if (!fields.includes(advanced[key].toLowerCase())) return false;
      }
    }
    // General search
    if (Object.keys(advanced).length === 0 && !fields.includes(q)) return false;
    return true;
  };
  const filtered = contacts.filter(filterContact);
  // Return only fields needed for the table
  res.json(filtered.map(contact => ({
    id: contact.id,
    name: contact.name,
    emails: contact.emails,
    phones: contact.phones,
    addresses: contact.addresses,
    notes: contact.notes,
    social_profiles: contact.social_profiles,
    User: contact.User ? {
      id: contact.User.id,
      username: contact.User.username,
      email: contact.User.email,
      first_name: contact.User.first_name,
      last_name: contact.User.last_name
    } : null
  })));
});

// Autocomplete endpoint for all fields
router.get('/autocomplete', isAuthenticated, async (req, res) => {
  const field = req.query.field || '';
  const query = (req.query.q || '').trim().toLowerCase();
  
  if (!field || !query) return res.json([]);
  
  let where = {};
  if (!(req.user.role && req.user.role.name === 'admin')) {
    where.user_id = req.user.id;
  }
  
  try {
    const contacts = await Contact.findAll({ where });
    const suggestions = new Set();
    
    contacts.forEach(contact => {
      switch (field) {
        case 'name':
          if (contact.name && contact.name.toLowerCase().includes(query)) {
            suggestions.add(contact.name);
          }
          break;
        case 'email':
          if (contact.emails) {
            contact.emails.forEach(email => {
              if (email.value && email.value.toLowerCase().includes(query)) {
                suggestions.add(email.value);
              }
            });
          }
          break;
        case 'phone':
          if (contact.phones) {
            contact.phones.forEach(phone => {
              if (phone.value && phone.value.toLowerCase().includes(query)) {
                suggestions.add(phone.value);
              }
            });
          }
          break;
        case 'address':
          if (contact.addresses) {
            contact.addresses.forEach(address => {
              if (address.value && address.value.toLowerCase().includes(query)) {
                suggestions.add(address.value);
              }
            });
          }
          break;
        case 'social':
          if (contact.social_profiles) {
            contact.social_profiles.forEach(social => {
              if (social.value && social.value.toLowerCase().includes(query)) {
                suggestions.add(social.value);
              }
            });
          }
          break;
        case 'note':
          if (contact.notes) {
            contact.notes.forEach(note => {
              if (note.value && note.value.toLowerCase().includes(query)) {
                suggestions.add(note.value);
              }
            });
          }
          break;
        case 'label':
          // Collect all custom labels from all fields
          ['emails', 'phones', 'addresses', 'social_profiles', 'notes'].forEach(fieldType => {
            if (contact[fieldType]) {
              contact[fieldType].forEach(item => {
                if (item.label && item.label.toLowerCase().includes(query) && 
                    !['home', 'work', 'mobile', 'other', 'note', 'twitter', 'facebook', 'instagram', 'linkedin', 'tiktok'].includes(item.label)) {
                  suggestions.add(item.label);
                }
              });
            }
          });
          break;
      }
    });
    
    // Convert to array and limit results
    const results = Array.from(suggestions).slice(0, 10);
    res.json(results);
  } catch (err) {
    console.error('Autocomplete error:', err);
    res.json([]);
  }
});

module.exports = router; 