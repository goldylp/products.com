const {
  isNonNegativeNumber,
  isPositiveNumber,
  isValidEmail,
  isValidImageReference,
  normalizeEmail,
  normalizeText
} = require('../utils/common');

const PRODUCT_BADGE_OPTIONS = ['', 'BEST SELLER', 'NEW', 'SALE'];

const validateProductPayload = (payload, { partial = false } = {}) => {
  const data = { ...payload };

  if (!partial || data.name !== undefined) {
    data.name = normalizeText(data.name);
    if (!data.name) return { error: partial ? 'Product name is required' : 'Name, image and price are required' };
  }

  if (!partial || data.image !== undefined) {
    data.image = normalizeText(data.image);
    if (!data.image) return { error: partial ? 'Please provide a valid image URL or uploaded image path' : 'Name, image and price are required' };
    if (!isValidImageReference(data.image)) return { error: 'Please provide a valid image URL or uploaded image path' };
  }

  if (!partial || data.price !== undefined) {
    if (data.price === undefined || !isPositiveNumber(data.price)) return { error: 'Price must be greater than 0' };
    data.price = Number(data.price);
  }

  if (data.weight !== undefined && data.weight !== '' && !isPositiveNumber(data.weight)) return { error: 'Weight must be greater than 0' };
  if (data.stock !== undefined && data.stock !== '' && !isNonNegativeNumber(data.stock)) return { error: 'Stock cannot be negative' };

  if (data.weight !== undefined) data.weight = Number(data.weight) || 1;
  if (data.stock !== undefined) data.stock = Number(data.stock) || 0;
  if (data.category !== undefined) data.category = normalizeText(data.category) || 'General';
  if (data.badge !== undefined) {
    data.badge = normalizeText(data.badge).toUpperCase();
    if (!PRODUCT_BADGE_OPTIONS.includes(data.badge)) return { error: 'Please select a valid badge' };
  }
  if (data.description !== undefined) data.description = normalizeText(data.description);

  return { data };
};

const validateCustomerPayload = ({ name, email }) => {
  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedName || !normalizedEmail) return { error: 'Name and email are required' };
  if (!isValidEmail(normalizedEmail)) return { error: 'Please enter a valid email address' };

  return { normalizedName, normalizedEmail };
};

const validateAdminUserPayload = ({ name, email, password, role, profileImage }, { partial = false } = {}) => {
  const normalizedName = normalizeText(name);
  const normalizedEmail = normalizeEmail(email);
  const normalizedProfileImage = normalizeText(profileImage);

  if ((!partial && (!normalizedName || !normalizedEmail || !password)) || (partial && (!normalizedName || !normalizedEmail))) {
    return { error: partial ? 'Name and email are required' : 'Name, email and password are required' };
  }
  if (!isValidEmail(normalizedEmail)) return { error: 'Please enter a valid email address' };
  if (password && password.length < 6) return { error: 'Password must be at least 6 characters' };
  if (!['admin', 'staff'].includes(role || 'admin')) return { error: 'Please select a valid admin role' };
  if (normalizedProfileImage && !isValidImageReference(normalizedProfileImage)) return { error: 'Please provide a valid profile image URL or uploaded image path' };

  return {
    normalizedName,
    normalizedEmail,
    normalizedProfileImage,
    role: role || 'admin'
  };
};

module.exports = {
  validateProductPayload,
  validateCustomerPayload,
  validateAdminUserPayload
};
