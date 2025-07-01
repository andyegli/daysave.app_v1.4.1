const nodemailer = require('nodemailer');
require('dotenv').config();
const { logAuthEvent, logAuthError } = require('../config/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

module.exports = async function sendMail({ to, subject, html }) {
  try {
    logAuthEvent('EMAIL_SEND_ATTEMPT', { to, subject });
    const info = await transporter.sendMail({
      from: process.env.GMAIL_FROM,
      to,
      subject,
      html
    });
    logAuthEvent('EMAIL_SEND_SUCCESS', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    logAuthError('EMAIL_SEND_ERROR', err, { to, subject });
    throw err;
  }
}; 