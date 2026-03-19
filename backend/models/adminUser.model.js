const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  name:                 { type: String, required: true },
  email:                { type: String, required: true, unique: true, lowercase: true },
  password:             { type: String, required: true },
  profileImage:         { type: String, default: '' },
  role:                 { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  createdAt:            { type: Date, default: Date.now },
  deletedAt:            { type: Date, default: null }
});

module.exports = mongoose.model('AdminUser', adminUserSchema);
