const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, trim: true },
  utm_source: { type: String, trim: true, default: '' },
  utm_medium: { type: String, trim: true, default: '' },
  utm_campaign: { type: String, trim: true, default: '' },
  fbclid: { type: String, trim: true, default: '' },
  source: { type: String, trim: true, default: 'facebook' },
  status: {
    type: String,
    enum: ['new', 'contacted', 'closed'],
    default: 'new'
  },
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'leads'
});

module.exports = mongoose.model('Lead', leadSchema);