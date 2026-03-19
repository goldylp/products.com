const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:                     { type: String, required: true },
  email:                    { type: String, required: true, unique: true, lowercase: true },
  password:                 { type: String, required: true },
  isEmailVerified:          { type: Boolean, default: false },
  emailVerificationToken:   { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  resetPasswordToken:       { type: String, default: null },
  resetPasswordExpires:     { type: Date, default: null },
  cart:                     [{
    productId: String,
    name:      String,
    price:     Number,
    quantity:  Number,
    image:     String,
    _id:       String
  }],
  createdAt:                { type: Date, default: Date.now },
  deletedAt:                { type: Date, default: null }
});

module.exports = mongoose.model('User', userSchema);
