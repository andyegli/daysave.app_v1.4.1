const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware');

router.get('/', isAuthenticated, (req, res) => {
  res.render('content/list', { user: req.user, title: 'Content Management - DaySave' });
});

module.exports = router; 