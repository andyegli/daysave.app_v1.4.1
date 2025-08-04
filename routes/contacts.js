const express = require('express');
const router = express.Router();
const { Contact, ContactGroup, ContactGroupMember, ContactRelation, Role, User } = require('../models');
const { isAuthenticated, ensureRoleLoaded, checkUsageLimit, updateUsage } = require('../middleware');
const { getGoogleMapsScriptUrl } = require('../config/maps');
const { logAuthEvent, logAuthError } = require('../config/logger');

// Apply role loading middleware to all routes
router.use(isAuthenticated, ensureRoleLoaded);

// Helper function to process and clean contact form data
function processContactFormData(formData) {
  const contactData = {
    name: formData.name ? formData.name.trim() : '',
    nickname: formData.nickname ? formData.nickname.trim() : '',
    organization: formData.organization ? formData.organization.trim() : '',
    job_title: formData.job_title ? formData.job_title.trim() : '',
    emails: [],
    phones: [],
    addresses: [],
    social_profiles: [],
    notes: [],
    urls: [],
    dates: [],
    instant_messages: []
  };

  // Process emails
  if (formData.emails) {
    const emailsArray = Array.isArray(formData.emails) ? formData.emails : Object.values(formData.emails);
    contactData.emails = emailsArray
      .filter(email => email && email.value && email.value.trim())
      .map(email => ({
        label: email.label || 'email',
        value: email.value.trim()
      }));
  }

  // Process phones
  if (formData.phones) {
    const phonesArray = Array.isArray(formData.phones) ? formData.phones : Object.values(formData.phones);
    contactData.phones = phonesArray
      .filter(phone => phone && phone.value && phone.value.trim())
      .map(phone => ({
        label: phone.label || 'phone',
        value: phone.value.trim()
      }));
  }

  // Process addresses
  if (formData.addresses) {
    const addressesArray = Array.isArray(formData.addresses) ? formData.addresses : Object.values(formData.addresses);
    contactData.addresses = addressesArray
      .filter(address => address && address.value && address.value.trim())
      .map(address => ({
        label: address.label || 'address',
        value: address.value.trim()
      }));
  }

  // Process social profiles
  if (formData.social_profiles) {
    const socialsArray = Array.isArray(formData.social_profiles) ? formData.social_profiles : Object.values(formData.social_profiles);
    contactData.social_profiles = socialsArray
      .filter(social => social && social.value && social.value.trim())
      .map(social => ({
        label: social.label || 'social',
        value: social.value.trim()
      }));
  }

  // Process notes
  if (formData.notes) {
    const notesArray = Array.isArray(formData.notes) ? formData.notes : Object.values(formData.notes);
    contactData.notes = notesArray
      .filter(note => note && note.value && note.value.trim())
      .map(note => ({
        label: note.label || 'note',
        value: note.value.trim()
      }));
  }

  return contactData;
}

// Moved catch-all route to end of file for proper routing priority

// Test maps functionality
router.get('/test-maps', isAuthenticated, (req, res) => {
  res.render('test-maps', { user: req.user });
});

// Contact form (for creating new contact)
router.get('/new', isAuthenticated, async (req, res) => {
  try {
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user,
      title: 'Add New Contact - DaySave',
      contact: null,
      isEdit: false,
      formAction: '/contacts',
      error: null,
      success: req.query.success || null,
      googleMapsScriptUrl
    });
  } catch (error) {
    res.render('contacts/form', { 
      user: req.user,
      title: 'Add New Contact - DaySave',
      contact: null,
      isEdit: false,
      formAction: '/contacts',
      error: 'Failed to load contact form.',
      success: null,
      googleMapsScriptUrl: null
    });
  }
});

// Create contact (POST)
router.post('/', [
  checkUsageLimit('contacts'),
  updateUsage('contacts')
], async (req, res) => {
  try {
    // Process and clean the form data
    const contactData = processContactFormData(req.body);
    contactData.user_id = req.user.id;
    
    // Validate required fields
    if (!contactData.name || contactData.name.trim().length === 0) {
      const googleMapsScriptUrl = getGoogleMapsScriptUrl();
      return res.render('contacts/form', { 
        user: req.user, 
        contact: req.body, 
        formAction: '/contacts', 
        method: 'POST', 
        error: 'Contact name is required.', 
        success: null,
        googleMapsScriptUrl 
      });
    }
    
    const newContact = await Contact.create(contactData);
    res.redirect(`/contacts/${newContact.id}?success=Contact created successfully`);
  } catch (err) {
    console.error('Error creating contact:', err);
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact: req.body, 
      formAction: '/contacts', 
      method: 'POST', 
      error: 'Failed to create contact. Please try again.', 
      success: null,
      googleMapsScriptUrl 
    });
  }
});

// Groups and Relationships Management Page
router.get('/groups-relationships', isAuthenticated, async (req, res) => {
  console.log('🚀 ========== GROUPS-RELATIONSHIPS ROUTE START ==========');
  console.log('🔍 Route accessed at:', new Date().toISOString());
  console.log('🔍 Request URL:', req.originalUrl);
  console.log('🔍 Request method:', req.method);
  console.log('🔍 User authenticated:', req.isAuthenticated());
  console.log('🔍 User object:', req.user ? { 
    id: req.user.id, 
    username: req.user.username,
    email: req.user.email,
    role: req.user.Role?.name 
  } : 'No user');
  console.log('🔍 Session ID:', req.sessionID);
  console.log('🔍 Request headers:', {
    'user-agent': req.headers['user-agent'],
    'accept': req.headers.accept,
    'referer': req.headers.referer
  });
  
  try {
    console.log('🎯 Attempting to render template: contacts/groups-relationships');
    
    // Check if we can access the view engine and views directory
    console.log('🔍 App view engine:', req.app.get('view engine'));
    console.log('🔍 App views directory:', req.app.get('views'));
    
    // Build the template data
    const templateData = { 
      user: req.user,
      error: null,
      success: req.query.success || null
    };
    console.log('🔍 Template data:', {
      hasUser: !!templateData.user,
      error: templateData.error,
      success: templateData.success
    });
    
    console.log('🎨 About to call res.render...');
    
    res.render('contacts/groups-relationships', templateData, (err, html) => {
      if (err) {
        console.error('❌ RENDER ERROR:', err);
        console.error('❌ Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        
        // Try to render a simple error page
        return res.status(500).send(`
          <h1>Template Render Error</h1>
          <p>Error: ${err.message}</p>
          <p>Template: contacts/groups-relationships</p>
          <pre>${err.stack}</pre>
        `);
      }
      
      console.log('✅ Template rendered successfully');
      console.log('📏 HTML length:', html ? html.length : 'No HTML');
      res.send(html);
    });
    
  } catch (error) {
    console.error('❌ ROUTE ERROR:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).send(`
      <h1>Route Error</h1>
      <p>Error: ${error.message}</p>
      <pre>${error.stack}</pre>
    `);
  }
  
  console.log('🏁 ========== GROUPS-RELATIONSHIPS ROUTE END ==========');
});

// MOVED TO END: Contact detail view - moved to avoid intercepting /groups

// MOVED TO END: Edit contact - moved to avoid intercepting /groups

// MOVED TO END: Update contact POST - moved to avoid intercepting /groups
// router.post('/:id', async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) return res.redirect('/contacts?error=Contact not found');
    
    // Check if user can edit this contact
    if (contact.user_id !== req.user.id && !(req.user.Role && req.user.Role.name === 'admin')) {
      return res.redirect('/contacts?error=Permission denied');
    }
    
    // Process and clean the form data
    const contactData = processContactFormData(req.body);
    
    // Validate required fields
    if (!contactData.name || contactData.name.trim().length === 0) {
      const googleMapsScriptUrl = getGoogleMapsScriptUrl();
      return res.render('contacts/form', { 
        user: req.user, 
        contact: { ...contact.toJSON(), ...req.body }, 
        formAction: `/contacts/${req.params.id}`, 
        method: 'POST', 
        error: 'Contact name is required.', 
        success: null,
        googleMapsScriptUrl 
      });
    }
    
    await contact.update(contactData);
    res.redirect(`/contacts/${contact.id}?success=Contact updated successfully`);
  } catch (err) {
    console.error('Error updating contact:', err);
    const googleMapsScriptUrl = getGoogleMapsScriptUrl();
    res.render('contacts/form', { 
      user: req.user, 
      contact: { ...req.body, id: req.params.id }, 
      formAction: `/contacts/${req.params.id}`, 
      method: 'POST', 
      error: 'Failed to update contact. Please try again.', 
      success: null,
      googleMapsScriptUrl 
    });
  }
});

// Delete contact
router.post('/:id/delete', async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    if (!contact) {
      return res.redirect('/contacts?error=Contact not found');
    }
    
    // Check if user can delete this contact
    if (contact.user_id !== req.user.id && !(req.user.Role && req.user.Role.name === 'admin')) {
      return res.redirect('/contacts?error=Permission denied');
    }
    
    const contactName = contact.name || 'Contact';
    await contact.destroy();
    
    res.redirect('/contacts?success=' + encodeURIComponent(`${contactName} has been deleted successfully`));
  } catch (err) {
    console.error('Error deleting contact:', err);
    res.redirect('/contacts?error=Failed to delete contact. Please try again.');
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



// ================================
// CONTACT GROUPS ROUTES
// ================================

// List all contact groups for the current user
router.get('/groups', isAuthenticated, async (req, res) => {
  console.log('🔍 /contacts/groups route accessed');
  console.log('🔍 User ID:', req.user?.id);
  console.log('🔍 Request headers:', req.headers.accept);
  
  try {
    // Check if models exist
    console.log('🔍 Checking ContactGroup model...');
    if (!ContactGroup) {
      console.error('❌ ContactGroup model not found');
      return res.status(500).json({ error: 'ContactGroup model not available' });
    }
    
    console.log('🔍 Fetching contact groups...');
    const groups = await ContactGroup.findAll({
      where: { user_id: req.user.id },
      include: [{
        model: ContactGroupMember,
        include: [{ model: Contact, attributes: ['id', 'name'] }]
      }],
      order: [['name', 'ASC']]
    });
    
    console.log('🔍 Found groups:', groups.length);
    res.json({ success: true, groups });
  } catch (error) {
    console.error('❌ Error fetching contact groups:', error);
    console.error('❌ Error details:', error.message);
    res.status(500).json({ error: 'Failed to fetch contact groups.' });
  }
});

// Create a new contact group
router.post('/groups', [
  isAuthenticated,
  checkUsageLimit('contact_groups'),
  updateUsage('contact_groups')
], async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    
    // Check if group already exists for this user
    const existingGroup = await ContactGroup.findOne({
      where: { user_id: req.user.id, name: name.trim() }
    });
    
    if (existingGroup) {
      return res.status(400).json({ error: 'A group with this name already exists.' });
    }
    
    const group = await ContactGroup.create({
      user_id: req.user.id,
      name: name.trim()
    });
    
    res.json({ success: true, group });
  } catch (error) {
    console.error('Error creating contact group:', error);
    res.status(500).json({ error: 'Failed to create contact group.' });
  }
});

// Update a contact group
router.put('/groups/:groupId', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required.' });
    }
    
    const group = await ContactGroup.findOne({
      where: { id: groupId, user_id: req.user.id }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    
    // Check if another group with the same name exists
    const existingGroup = await ContactGroup.findOne({
      where: { 
        user_id: req.user.id, 
        name: name.trim(),
        id: { [require('sequelize').Op.ne]: groupId }
      }
    });
    
    if (existingGroup) {
      return res.status(400).json({ error: 'A group with this name already exists.' });
    }
    
    await group.update({ name: name.trim() });
    
    res.json({ success: true, group });
  } catch (error) {
    console.error('Error updating contact group:', error);
    res.status(500).json({ error: 'Failed to update contact group.' });
  }
});

// Delete a contact group
router.delete('/groups/:groupId', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const group = await ContactGroup.findOne({
      where: { id: groupId, user_id: req.user.id }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    
    // Delete all group memberships first
    await ContactGroupMember.destroy({
      where: { group_id: groupId }
    });
    
    // Delete the group
    await group.destroy();
    
    res.json({ success: true, message: 'Group deleted successfully.' });
  } catch (error) {
    console.error('Error deleting contact group:', error);
    res.status(500).json({ error: 'Failed to delete contact group.' });
  }
});

// Add contact to group
router.post('/groups/:groupId/members', isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.params;
    const { contact_id } = req.body;
    
    // Verify group belongs to user
    const group = await ContactGroup.findOne({
      where: { id: groupId, user_id: req.user.id }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    
    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contact_id, user_id: req.user.id }
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    
    // Check if membership already exists
    const existingMembership = await ContactGroupMember.findOne({
      where: { contact_id, group_id: groupId }
    });
    
    if (existingMembership) {
      return res.status(400).json({ error: 'Contact is already in this group.' });
    }
    
    const membership = await ContactGroupMember.create({
      contact_id,
      group_id: groupId
    });
    
    res.json({ success: true, membership });
  } catch (error) {
    console.error('Error adding contact to group:', error);
    res.status(500).json({ error: 'Failed to add contact to group.' });
  }
});

// Remove contact from group
router.delete('/groups/:groupId/members/:contactId', isAuthenticated, async (req, res) => {
  try {
    const { groupId, contactId } = req.params;
    
    // Verify group belongs to user
    const group = await ContactGroup.findOne({
      where: { id: groupId, user_id: req.user.id }
    });
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found.' });
    }
    
    // Remove membership
    const deleted = await ContactGroupMember.destroy({
      where: { contact_id: contactId, group_id: groupId }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Contact is not in this group.' });
    }
    
    res.json({ success: true, message: 'Contact removed from group.' });
  } catch (error) {
    console.error('Error removing contact from group:', error);
    res.status(500).json({ error: 'Failed to remove contact from group.' });
  }
});

// ================================
// CONTACT RELATIONSHIPS ROUTES
// ================================

// List all relationships for the current user
router.get('/relationships', isAuthenticated, async (req, res) => {
  try {
    const relationships = await ContactRelation.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Contact, as: 'Contact1', attributes: ['id', 'name'] },
        { model: Contact, as: 'Contact2', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, relationships });
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: 'Failed to fetch relationships.' });
  }
});

// Get relationships for a specific contact
router.get('/:contactId/relationships', isAuthenticated, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Verify contact belongs to user
    const contact = await Contact.findOne({
      where: { id: contactId, user_id: req.user.id }
    });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' });
    }
    
    const relationships = await ContactRelation.findAll({
      where: {
        user_id: req.user.id,
        [require('sequelize').Op.or]: [
          { contact_id_1: contactId },
          { contact_id_2: contactId }
        ]
      },
      include: [
        { model: Contact, as: 'Contact1', attributes: ['id', 'name'] },
        { model: Contact, as: 'Contact2', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ success: true, relationships });
  } catch (error) {
    console.error('Error fetching contact relationships:', error);
    res.status(500).json({ error: 'Failed to fetch contact relationships.' });
  }
});

// Create a new relationship
router.post('/relationships', [
  checkUsageLimit('relationships'),
  updateUsage('relationships')
], async (req, res) => {
  try {
    const { contact_id_1, contact_id_2, relation_type } = req.body;
    
    if (!contact_id_1 || !contact_id_2 || !relation_type) {
      return res.status(400).json({ error: 'Both contacts and relationship type are required.' });
    }
    
    if (contact_id_1 === contact_id_2) {
      return res.status(400).json({ error: 'Cannot create relationship between the same contact.' });
    }
    
    // Verify both contacts belong to user
    const contacts = await Contact.findAll({
      where: { 
        id: [contact_id_1, contact_id_2], 
        user_id: req.user.id 
      }
    });
    
    if (contacts.length !== 2) {
      return res.status(404).json({ error: 'One or both contacts not found.' });
    }
    
    // Check if relationship already exists
    const existingRelation = await ContactRelation.findOne({
      where: {
        user_id: req.user.id,
        [require('sequelize').Op.or]: [
          { contact_id_1, contact_id_2, relation_type },
          { contact_id_1: contact_id_2, contact_id_2: contact_id_1, relation_type }
        ]
      }
    });
    
    if (existingRelation) {
      return res.status(400).json({ error: 'This relationship already exists.' });
    }
    
    const relationship = await ContactRelation.create({
      user_id: req.user.id,
      contact_id_1,
      contact_id_2,
      relation_type: relation_type.trim()
    });
    
    // Fetch the created relationship with contact details
    const relationshipWithContacts = await ContactRelation.findOne({
      where: { id: relationship.id },
      include: [
        { model: Contact, as: 'Contact1', attributes: ['id', 'name'] },
        { model: Contact, as: 'Contact2', attributes: ['id', 'name'] }
      ]
    });
    
    res.json({ success: true, relationship: relationshipWithContacts });
  } catch (error) {
    console.error('Error creating relationship:', error);
    res.status(500).json({ error: 'Failed to create relationship.' });
  }
});

// Delete a relationship
router.delete('/relationships/:relationshipId', isAuthenticated, async (req, res) => {
  try {
    const { relationshipId } = req.params;
    
    const relationship = await ContactRelation.findOne({
      where: { id: relationshipId, user_id: req.user.id }
    });
    
    if (!relationship) {
      return res.status(404).json({ error: 'Relationship not found.' });
    }
    
    await relationship.destroy();
    
    res.json({ success: true, message: 'Relationship deleted successfully.' });
  } catch (error) {
    console.error('Error deleting relationship:', error);
    res.status(500).json({ error: 'Failed to delete relationship.' });
  }
});

// Get predefined relationship types
router.get('/relationship-types', (req, res) => {
  const relationshipTypes = {
    family: [
      'Parent', 'Child', 'Spouse', 'Sibling', 
      'Mother', 'Father', 'Son', 'Daughter',
      'Wife', 'Husband', 'Brother', 'Sister',
      'Grandmother', 'Grandfather', 'Grandson', 'Granddaughter',
      'Aunt', 'Uncle', 'Niece', 'Nephew', 'Cousin'
    ],
    professional: [
      'Colleague', 'Boss', 'Employee', 'Manager', 'Supervisor',
      'Business Partner', 'Client', 'Vendor', 'Contractor',
      'Mentor', 'Mentee', 'Coworker'
    ],
    social: [
      'Friend', 'Best Friend', 'Acquaintance', 'Neighbor', 
      'Classmate', 'Roommate', 'Ex', 'Dating'
    ],
    other: [
      'Doctor', 'Lawyer', 'Accountant', 'Teacher', 'Student',
      'Landlord', 'Tenant', 'Emergency Contact'
    ]
  };
  
  res.json({ success: true, relationshipTypes });
});

// ================================
// CATCH-ALL ROUTE (MUST BE LAST!)
// ================================

// List contacts - moved to end for proper routing priority
router.get('/', isAuthenticated, async (req, res) => {
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
  } catch (error) {
    logAuthEvent('CONTACTS_LIST_ERROR', {
      userId: req.user.id,
      isAdmin: req.user.Role?.name === 'admin'
    });
    res.render('contacts/list', { user: req.user, contacts: [], owners: [], ownerFilter: '', error: 'Failed to load contacts.', success: null });
  }
});

module.exports = router; 