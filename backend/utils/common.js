const crypto = require('crypto');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPLOADS_PATH_REGEX = /^\/uploads\/.+/i;

const normalizeText = (value = '') => String(value).trim();
const normalizeEmail = (value = '') => normalizeText(value).toLowerCase();
const isValidEmail = (value = '') => EMAIL_REGEX.test(normalizeEmail(value));
const isValidImageReference = (value = '') => {
  const normalized = normalizeText(value);
  return /^https?:\/\/\S+$/i.test(normalized) || UPLOADS_PATH_REGEX.test(normalized);
};
const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  return {
    token,
    hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  };
};

const getHashedResetToken = (token = '') => crypto.createHash('sha256').update(token).digest('hex');
const getHashedVerificationToken = (token = '') => crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  normalizeText,
  normalizeEmail,
  isValidEmail,
  isValidImageReference,
  isNonNegativeNumber,
  isPositiveNumber,
  createPasswordResetToken,
  getHashedResetToken,
  getHashedVerificationToken
};
