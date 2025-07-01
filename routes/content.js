const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, (req, res) => {
  res.render('content/list', { user: req.user, title: 'Content Management - DaySave' });
});

router.get('/manage', isAuthenticated, (req, res) => {
  const contentItems = [
    { title: 'Instagram Post', image: '/public/images/content_section.png', description: 'A recent Instagram post.' },
    { title: 'Twitter Thread', image: '/public/images/content_section.png', description: 'A thread about productivity.' },
    { title: 'Facebook Update', image: '/public/images/content_section.png', description: 'Shared a new milestone.' }
  ];
  res.render('content/manage', { user: req.user, contentItems });
});

module.exports = router; 