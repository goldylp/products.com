const path = require('path');

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/products_store';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const ACTIVE_RECORD_FILTER = { deletedAt: null };
const SEED_DEFAULT_ADMIN = ['1', 'true', 'yes'].includes(String(process.env.SEED_DEFAULT_ADMIN || 'true').toLowerCase());

module.exports = {
  PORT,
  MONGODB_URI,
  UPLOADS_DIR,
  ACTIVE_RECORD_FILTER,
  SEED_DEFAULT_ADMIN
};
