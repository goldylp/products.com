const { isValidEmail, normalizeEmail, normalizeText } = require('../utils/common');

const validateSignupPayload = ({ name, email, password }) => {
  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName || !normalizedEmail || !password) return { error: 'Name, email and password are required' };
  if (!isValidEmail(normalizedEmail)) return { error: 'Please enter a valid email address' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };

  return { normalizedName, normalizedEmail };
};

const validateLoginPayload = ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return { error: 'Email and password are required' };
  if (!isValidEmail(normalizedEmail)) return { error: 'Please enter a valid email address' };

  return { normalizedEmail };
};

const validateForgotPasswordPayload = ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { error: 'Email is required' };
  if (!isValidEmail(normalizedEmail)) return { error: 'Please enter a valid email address' };

  return { normalizedEmail };
};

const validateResetPasswordPayload = ({ token, password, confirmPassword }) => {
  if (!token || !password || !confirmPassword) return { error: 'Token, password and confirm password are required' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters' };
  if (password !== confirmPassword) return { error: 'Passwords do not match' };

  return { token, password };
};

module.exports = {
  validateSignupPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload
};
