const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Stripe = require('stripe');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/products_store';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// ─── Schemas & Models ─────────────────────────────────────────────────────────

const productSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true }
});
const Product = mongoose.model('Product', productSchema);

// NEW: User schema — password is stored as a bcrypt hash, never plain text
const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },   // bcrypt hash
  // Cart stored in DB so it survives browser cache clears
  cart:      [{
    productId: String,
    name:      String,
    price:     Number,
    quantity:  Number,
    image:     String,
    _id:       String
  }],
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// UPDATED: Order schema now has an optional userId to link orders to accounts
const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = guest
  items: [{
    productId: String,
    name:      String,
    price:     Number,
    quantity:  Number,
    image:     String
  }],
  total:           { type: Number, required: true },
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
  createdAt:     { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ─── Auth Middleware ──────────────────────────────────────────────────────────
// Works like a gatekeeper — attach to any route that requires login.
// It reads the JWT from the Authorization header, verifies it, and
// attaches the decoded user ID to req.userId so route handlers can use it.
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // Header format: "Bearer <token>"
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next(); // pass control to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Seed Products ────────────────────────────────────────────────────────────
const seedProducts = async () => {
  const products = [
    { name: 'Whey Protein Isolate - 5lbs',    image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 79.99 },
    { name: 'Pre-Workout Energy - 30 Servings',image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400',   price: 49.99 },
    { name: 'Creatine Monohydrate - 60 Caps',  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', price: 29.99 },
    { name: 'Multi-Vitamin Complex',            image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400',   price: 34.99 },
    { name: 'BCAA Recovery - 40 Servings',     image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', price: 39.99 },
    { name: 'Casein Protein - 2lbs',           image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 54.99 },
    { name: 'L-Glutamine - 60 Servings',       image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', price: 27.99 },
    { name: 'Fish Oil Omega-3 - 90 Caps',      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',   price: 24.99 },
    { name: 'Beta-Alanine - 60 Caps',          image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', price: 22.99 },
    { name: 'Mass Gainer - 6lbs',              image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 69.99 },
    { name: 'ZMA Sleep Support',               image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400', price: 26.99 },
    { name: 'Vegan Protein - 2lbs',            image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 44.99 }
  ];
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log('Products seeded successfully');
};
seedProducts();

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// POST /api/auth/signup
// Creates a new user. Password is hashed with bcrypt before saving.
// Returns a JWT so the user is immediately logged in after signup.
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Check email not already registered
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });

    // bcrypt.hash(password, 10) — 10 is the "salt rounds", higher = slower but safer
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashedPassword });

    // Sign a JWT containing the user's MongoDB _id
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }  // token expires in 7 days
    );

    res.status(201).json({
      token,
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
// Verifies email + password, returns a fresh JWT.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'Invalid email or password' });

    // bcrypt.compare checks the plain password against the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Also return the user's saved cart so frontend can restore it
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
      cart: user.cart || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  (protected)
// Used on app startup to verify a stored token and restore the session.
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password'); // never send password
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cart Sync Routes ─────────────────────────────────────────────────────────

// POST /api/cart/sync  (protected)
// Saves the user's current cart to MongoDB.
// Called automatically every time the cart changes (if user is logged in).
app.post('/api/cart/sync', authenticate, async (req, res) => {
  try {
    const { cart } = req.body;
    await User.findByIdAndUpdate(req.userId, { cart });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cart  (protected)
// Fetches the user's saved cart from MongoDB.
app.get('/api/cart', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('cart');
    res.json({ cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Product Routes ───────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Payment Routes ───────────────────────────────────────────────────────────

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Order Routes ─────────────────────────────────────────────────────────────

// POST /api/orders
// Now accepts an optional Authorization header.
// If a valid token is present, the order is linked to that user account.
app.post('/api/orders', async (req, res) => {
  try {
    const {
      items, total, stripePaymentId,
      customerEmail, customerPhone,
      shippingAddress, billingAddress, sameAsBilling
    } = req.body;

    const errors = [];
    if (!items || !Array.isArray(items) || items.length === 0) errors.push('Cart is empty');
    if (!total || typeof total !== 'number' || total <= 0)       errors.push('Invalid total amount');
    if (!stripePaymentId)                                         errors.push('Payment required');
    if (!customerEmail && !customerPhone)                         errors.push('Email or phone required');
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errors.push('Invalid email format');
    if (errors.length) return res.status(400).json({ errors });

    // Try to identify if this is a logged-in user
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (_) {
        // token invalid — treat as guest, no error thrown
      }
    }

    const order = await Order.create({
      userId,  // null for guests, MongoDB ObjectId for logged-in users
      items, total, stripePaymentId,
      customerEmail, customerPhone,
      shippingAddress,
      billingAddress: sameAsBilling ? shippingAddress : billingAddress,
      sameAsBilling
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id  — fetch single order (used by OrderConfirmation page)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/my-orders  (protected)
// Returns all orders placed by the logged-in user, newest first.
app.get('/api/my-orders', authenticate, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));