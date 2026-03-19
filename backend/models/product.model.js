const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  image:       { type: String, required: true },
  price:       { type: Number, required: true },
  weight:      { type: Number, default: 1 },
  category:    { type: String, default: 'General' },
  badge:       { type: String, default: '' },
  description: { type: String, default: '' },
  stock:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  deletedAt:   { type: Date, default: null }
});

module.exports = mongoose.model('Product', productSchema);
