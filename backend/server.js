const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/products_store';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Product Schema
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true }
});

const Product = mongoose.model('Product', productSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: Number,
    image: String
  }],
  total: { type: Number, required: true },
  stripePaymentId: { type: String, required: true },
  customerEmail: { type: String },
  customerPhone: { type: String },
  shippingAddress: {
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  billingAddress: {
    fullName: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String }
  },
  sameAsBilling: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', orderSchema);

// Seed products on startup
const seedProducts = async () => {
  // Always clear and reseed for development
  const products = [
      { name: 'Whey Protein Isolate - 5lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 79.99 },
      { name: 'Pre-Workout Energy - 30 Servings', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400', price: 49.99 },
      { name: 'Creatine Monohydrate - 60 Caps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', price: 29.99 },
      { name: 'Multi-Vitamin Complex', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400', price: 34.99 },
      { name: 'BCAA Recovery - 40 Servings', image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', price: 39.99 },
      { name: 'Casein Protein - 2lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 54.99 },
      { name: 'L-Glutamine - 60 Servings', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', price: 27.99 },
      { name: 'Fish Oil Omega-3 - 90 Caps', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', price: 24.99 },
      { name: 'Beta-Alanine - 60 Caps', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', price: 22.99 },
      { name: 'Mass Gainer - 6lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 69.99 },
      { name: 'ZMA Sleep Support', image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400', price: 26.99 },
      { name: 'Vegan Protein - 2lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 44.99 }
    ];
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log('Products seeded successfully');
};

seedProducts();

// Routes

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Stripe Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order with validation
app.post('/api/orders', async (req, res) => {
  try {
    const {
      items,
      total,
      stripePaymentId,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      sameAsBilling
    } = req.body;

    // Validate required fields
    const errors = [];

    if (!items || !Array.isArray(items) || items.length === 0) {
      errors.push('Cart is empty');
    }

    if (!total || typeof total !== 'number' || total <= 0) {
      errors.push('Invalid total amount');
    }

    if (!stripePaymentId) {
      errors.push('Payment required');
    }

    // Email or phone required
    if (!customerEmail && !customerPhone) {
      errors.push('Email or phone number is required');
    }

    // Validate email format if provided
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.push('Invalid email format');
    }

    // Validate phone format if provided (accepts various formats)
    if (customerPhone && !/^[\d\s\-+()]{7,20}$/.test(customerPhone)) {
      errors.push('Invalid phone number format');
    }

    // Validate shipping address
    if (!shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      if (!shippingAddress.fullName || shippingAddress.fullName.trim().length < 2) {
        errors.push('Shipping full name is required');
      }
      if (!shippingAddress.addressLine1 || shippingAddress.addressLine1.trim().length < 5) {
        errors.push('Shipping address line 1 is required');
      }
      if (!shippingAddress.city || shippingAddress.city.trim().length < 2) {
        errors.push('Shipping city is required');
      }
      if (!shippingAddress.state || shippingAddress.state.trim().length < 2) {
        errors.push('Shipping state is required');
      }
      if (!shippingAddress.zipCode || !/^[\d\s\-]{3,10}$/.test(shippingAddress.zipCode)) {
        errors.push('Valid shipping ZIP code is required');
      }
      if (!shippingAddress.country || shippingAddress.country.trim().length < 2) {
        errors.push('Shipping country is required');
      }
    }

    // Validate billing address if not same as shipping
    if (!sameAsBilling && billingAddress) {
      const requiredBillingFields = ['fullName', 'addressLine1', 'city', 'state', 'zipCode', 'country'];
      for (const field of requiredBillingFields) {
        if (!billingAddress[field] || billingAddress[field].toString().trim().length < 2) {
          errors.push(`Billing ${field} is required when different from shipping`);
          break;
        }
      }
    }

    // Return validation errors
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    // Prepare billing address
    const finalBillingAddress = sameAsBilling ? shippingAddress : billingAddress;

    const order = new Order({
      items,
      total,
      stripePaymentId,
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      shippingAddress,
      billingAddress: finalBillingAddress || null,
      sameAsBilling: sameAsBilling || false
    });

    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));