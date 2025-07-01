const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, (req, res) => {
  res.render('files/list', { user: req.user, title: 'File Management - DaySave' });
});

module.exports = router; 