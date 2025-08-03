const auth = require('./auth');
const error = require('./error');
const security = require('./security');
const validation = require('./validation');
const apiKey = require('./apiKey');
const subscription = require('./subscription');
const { deviceFingerprinting, middleware: deviceFingerprintMiddleware } = require('./deviceFingerprinting');

module.exports = {
  ...auth,
  ...error,
  ...security,
  ...validation,
  ...apiKey,
  ...subscription,
  deviceFingerprinting,
  deviceFingerprintMiddleware
}; 