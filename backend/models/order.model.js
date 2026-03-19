const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: [{
    productId: String,
    name:      String,
    price:     Number,
    quantity:  Number,
    image:     String
  }],
  total:           { type: Number, required: true },
  shippingCost:    { type: Number, default: 0 },
  shippingMethod:  { type: String },
  stripePaymentId: { type: String, required: true },
  customerEmail:   { type: String },
  customerPhone:   { type: String },
  shippingAddress: {
    fullName:     { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city:         { type: String, required: true },
    state:        { type: String, required: true },
    zipCode:      { type: String, required: true },
    country:      { type: String, required: true }
  },
  billingAddress: {
    fullName:     String,
    addressLine1: String,
    addressLine2: String,
    city:         String,
    state:        String,
    zipCode:      String,
    country:      String
  },
  sameAsBilling: { type: Boolean, default: false },
  status:        { type: String, default: 'processing' },
  createdAt:     { type: Date, default: Date.now },
  deletedAt:     { type: Date, default: null }
});

module.exports = mongoose.model('Order', orderSchema);
