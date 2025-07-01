const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

module.exports = async function sendMail({ to, subject, html }) {
  return transporter.sendMail({
    from: process.env.GMAIL_FROM,
    to,
    subject,
    html
  });
}; 