const express = require('express');
const router = express.Router();
const { Contact, Role, User } = require('../models');
const { isAuthenticated, ensureRoleLoaded } = require('../middleware');
const { getGoogleMapsScriptUrl } = require('../config/maps');
const { logAuthEvent, logAuthError } = require('../config/logger');

// Apply role loading middleware to all routes
router.use(isAuthenticated, ensureRoleLoaded);

// List contacts
router.get('/', async (req, res) => {
  try {
    let contacts, owners = [];
    let ownerFilter = req.query.owner_id || '';
    
    if (req.user.Role && req.user.Role.name === 'admin') {
      // Log admin accessing contacts with elevated privileges
      logAuthEvent('ADMIN_CONTACTS_ACCESS', {
        adminId: req.user.id,
        adminUsername: req.user.username,
        ownerFilter: ownerFilter || 'all',
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      });
      
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
      
      // Log admin contact filtering action
      if (ownerFilter) {
        logAuthEvent('ADMIN_CONTACTS_FILTER', {
          adminId: req.user.id,
          adminUsername: req.user.username,
          filterType: 'owner',
          filterValue: ownerFilter,
          resultCount: contacts.length,
          ip: req.ip,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Regular user accessing their own contacts
      contacts = await Contact.findAll({
        where: { user_id: req.user.id },
        include: [{ model: User, attributes: ['id', 'username', 'email', 'first_name', 'last_name'] }],
        order: [['name', 'ASC']]
      });
    }
    
    res.render('contacts/list', { user: req.user, contacts, owners, ownerFilter, error: null, success: req.query.success || null });
  } catch (err) {
    logAuthError('CONTACTS_LIST_ERROR', err, { 
      userId: req.user.id,
      isAdmin: req.user.Role?.name === 'admin' 
    });
    res.render('contacts/list', { user: req.user, contacts: [], owners: [], ownerFilter: '', error: 'Failed to load contacts.', success: null });
  }
});

// Test Google Maps API
router.get('/test-maps', isAuthenticated, (req, res) => {
  res.render('test-maps', { 
    mapsScriptUrl: getGoogleMapsScriptUrl()
  });
});

// Contact form (for creating new contact)
router.get('/new', async (req, res) => {
  try {
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact: {}, 
      formAction: '/contacts', 
      method: 'POST', 
      error: null, 
      success: null,
      googleMapsScriptUrl 
    });
  } catch (err) {
    res.render('contacts/form', { 
      user: req.user, 
      contact: {}, 
      formAction: '/contacts', 
      method: 'POST', 
      error: 'Failed to load form.', 
      success: null,
      googleMapsScriptUrl: null 
    });
  }
});

// Create contact (POST)
router.post('/', async (req, res) => {
  try {
    const contactData = {
      ...req.body,
      user_id: req.user.id
    };
    await Contact.create(contactData);
    res.redirect('/contacts?success=Contact created');
  } catch (err) {
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact: req.body, 
      formAction: '/contacts', 
      method: 'POST', 
      error: 'Failed to create contact.', 
      success: null,
      googleMapsScriptUrl 
    });
  }
});

// Edit contact (form)
router.get('/:id/edit', async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    
    // Check if user can edit this contact
    if (contact.user_id !== req.user.id && !(req.user.Role && req.user.Role.name === 'admin')) {
      return res.redirect('/contacts?error=Permission denied');
    }
    
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact, 
      formAction: `/contacts/${req.params.id}`, 
      method: 'POST', 
      error: null, 
      success: null,
      googleMapsScriptUrl 
    });
  } catch (err) {
    res.redirect('/contacts?error=Failed to load contact');
  }
});

// Update contact (POST)
router.post('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    
    // Check if user can edit this contact
    if (contact.user_id !== req.user.id && !(req.user.Role && req.user.Role.name === 'admin')) {
      return res.redirect('/contacts?error=Permission denied');
    }
    
    await contact.update(req.body);
    res.redirect('/contacts?success=Contact updated');
  } catch (err) {
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact: req.body, 
      formAction: `/contacts/${req.params.id}`, 
      method: 'POST', 
      error: 'Failed to update contact.', 
      success: null,
      googleMapsScriptUrl 
    });
  }
});

// Delete contact
router.post('/:id/delete', async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    
    // Check if user can delete this contact
    if (contact.user_id !== req.user.id && !(req.user.Role && req.user.Role.name === 'admin')) {
      return res.redirect('/contacts?error=Permission denied');
    }
    
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
  if (!(req.user.Role && req.user.Role.name === 'admin')) {
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
  if (!(req.user.Role && req.user.Role.name === 'admin')) {
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