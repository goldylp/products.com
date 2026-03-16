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
  price: { type: Number, required: true },
  weight: { type: Number, default: 1 }
});
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
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
  createdAt:     { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ─── Auth Middleware ──────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─── Seed Products ────────────────────────────────────────────────────────────
const seedProducts = async () => {
  const products = [
    { name: 'Whey Protein Isolate - 5lbs',     image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 79.99 },
    { name: 'Pre-Workout Energy - 30 Servings', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400',   price: 49.99 },
    { name: 'Creatine Monohydrate - 60 Caps',  image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', price: 29.99 },
    { name: 'Multi-Vitamin Complex',            image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400',   price: 34.99 },
    { name: 'BCAA Recovery - 40 Servings',      image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', price: 39.99 },
    { name: 'Casein Protein - 2lbs',            image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 54.99 },
    { name: 'L-Glutamine - 60 Servings',        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', price: 27.99 },
    { name: 'Fish Oil Omega-3 - 90 Caps',       image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',   price: 24.99 },
    { name: 'Beta-Alanine - 60 Caps',           image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', price: 22.99 },
    { name: 'Mass Gainer - 6lbs',               image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 69.99 },
    { name: 'ZMA Sleep Support',                image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400', price: 26.99 },
    { name: 'Vegan Protein - 2lbs',             image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 44.99 }
  ];
  await Product.deleteMany({});
  await Product.insertMany(products);
  console.log('Products seeded successfully');
};
seedProducts();

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { _id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Invalid email or password' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email }, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cart Sync Routes ─────────────────────────────────────────────────────────

app.post('/api/cart/sync', authenticate, async (req, res) => {
  try {
    const { cart } = req.body;
    await User.findByIdAndUpdate(req.userId, { cart });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ─── Shipping Routes ──────────────────────────────────────────────────────────

// POST /api/shipping/rates
// Uses the UPS legacy XML API — the same one your CodeIgniter project uses.
// Works for both test and live with the same credentials.
//
// Required .env vars:
//   UPS_ACCESS_KEY     — your UPS Access License Number (UPS_AUTHORIZATION_KEY from CI4)
//   UPS_USERNAME       — your UPS.com login email
//   UPS_PASSWORD       — your UPS.com login password
//   UPS_SHIPPER_NUMBER — your UPS account number
//
// Test endpoint:  https://wwwcie.ups.com/ups.app/xml/Rate
// Live endpoint:  https://onlinetools.ups.com/ups.app/xml/Rate
// Swap the URL below when going to production — everything else stays the same.
app.post('/api/shipping/rates', async (req, res) => {
  try {
    const { items, address } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items in cart' });
    }

    if (!address || !address.country || !address.state || !address.city || !address.zipCode) {
      return res.status(400).json({ error: 'Complete shipping address required' });
    }

    // Calculate total weight (default 1 lb per item if not set on product)
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1) * item.quantity, 0);
    const packageWeight = String(Math.max(1, Math.ceil(totalWeight)));

    const UPS_ACCESS_KEY     = process.env.UPS_ACCESS_KEY;
    const UPS_USERNAME       = process.env.UPS_USERNAME;
    const UPS_PASSWORD       = process.env.UPS_PASSWORD;
    const UPS_SHIPPER_NUMBER = process.env.UPS_SHIPPER_NUMBER || '';

    // ── No credentials → return mock rates immediately ────────────────────────
    if (!UPS_ACCESS_KEY || !UPS_USERNAME || !UPS_PASSWORD) {
      console.log('UPS credentials not configured — returning mock rates');
      return res.json({ rates: getMockRates(totalWeight), weight: totalWeight, mock: true });
    }

    // ── Map country names → ISO codes ─────────────────────────────────────────
    const countryCodes = {
      'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB',
      'Australia': 'AU', 'Germany': 'DE', 'France': 'FR', 'India': 'IN'
    };
    const destCountry = countryCodes[address.country] || address.country;

    // ── Build the UPS XML request ─────────────────────────────────────────────
    // Two XML documents sent in one POST body, separated by a newline.
    // First doc = security/auth block. Second doc = the actual rate request.
    const xmlRequest = `<?xml version="1.0"?>
<AccessRequest xml:lang="en-US">
  <AccessLicenseNumber>${UPS_ACCESS_KEY}</AccessLicenseNumber>
  <UserId>${UPS_USERNAME}</UserId>
  <Password>${UPS_PASSWORD}</Password>
</AccessRequest>
<?xml version="1.0"?>
<RatingServiceSelectionRequest xml:lang="en-US">
  <Request>
    <TransactionReference>
      <CustomerContext>HealthFuel Rate Request</CustomerContext>
    </TransactionReference>
    <RequestAction>Rate</RequestAction>
    <RequestOption>Shop</RequestOption>
  </Request>
  <PickupType>
    <Code>03</Code>
  </PickupType>
  <Shipment>
    <Shipper>
      <Name>HealthFuel Store</Name>
      <ShipperNumber>${UPS_SHIPPER_NUMBER}</ShipperNumber>
      <Address>
        <AddressLine1>123 Store St</AddressLine1>
        <City>Los Angeles</City>
        <StateProvinceCode>CA</StateProvinceCode>
        <PostalCode>90001</PostalCode>
        <CountryCode>US</CountryCode>
      </Address>
    </Shipper>
    <ShipTo>
      <CompanyName>Customer</CompanyName>
      <Address>
        <AddressLine1>${address.addressLine1 || ''}</AddressLine1>
        <City>${address.city}</City>
        <StateProvinceCode>${address.state}</StateProvinceCode>
        <PostalCode>${address.zipCode}</PostalCode>
        <CountryCode>${destCountry}</CountryCode>
      </Address>
    </ShipTo>
    <ShipFrom>
      <CompanyName>HealthFuel Store</CompanyName>
      <Address>
        <AddressLine1>123 Store St</AddressLine1>
        <City>Los Angeles</City>
        <StateProvinceCode>CA</StateProvinceCode>
        <PostalCode>90001</PostalCode>
        <CountryCode>US</CountryCode>
      </Address>
    </ShipFrom>
    <Package>
      <PackagingType>
        <Code>02</Code>
      </PackagingType>
      <PackageWeight>
        <UnitOfMeasurement>
          <Code>LBS</Code>
        </UnitOfMeasurement>
        <Weight>${packageWeight}</Weight>
      </PackageWeight>
    </Package>
  </Shipment>
</RatingServiceSelectionRequest>`;

    // ── POST to UPS XML endpoint ──────────────────────────────────────────────
    // Test URL  → https://wwwcie.ups.com/ups.app/xml/Rate
    // Live URL  → https://onlinetools.ups.com/ups.app/xml/Rate
    const upsUrl = 'https://wwwcie.ups.com/ups.app/xml/Rate';

    const upsResponse = await fetch(upsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: xmlRequest
    });

    const xmlText = await upsResponse.text();

    // ── Parse the XML response ────────────────────────────────────────────────
    // Simple regex-based extraction — no XML lib needed for this flat structure
    const responseCode = xmlText.match(/<ResponseStatusCode>(\d+)<\/ResponseStatusCode>/)?.[1];

    if (responseCode !== '1') {
      const errDesc = xmlText.match(/<ErrorDescription>(.*?)<\/ErrorDescription>/)?.[1] || 'Unknown UPS error';
      console.error('UPS XML API error:', errDesc);
      return res.json({ rates: getMockRates(totalWeight), weight: totalWeight, mock: true });
    }

    const serviceNames = {
      '01': 'UPS Next Day Air',
      '02': 'UPS 2nd Day Air',
      '03': 'UPS Ground',
      '12': 'UPS 3 Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early',
      '59': 'UPS 2nd Day Air A.M.',
      '65': 'UPS Worldwide Saver',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '11': 'UPS Standard'
    };

    // Each rated service is wrapped in a <RatedShipment> block
    const shipmentBlocks = xmlText.match(/<RatedShipment>[\s\S]*?<\/RatedShipment>/g) || [];

    if (shipmentBlocks.length === 0) {
      console.warn('UPS returned 0 rated shipments — falling back to mock rates');
      return res.json({ rates: getMockRates(totalWeight), weight: totalWeight, mock: true });
    }

    const rates = shipmentBlocks.map(block => {
      const code  = block.match(/<Service>[\s\S]*?<Code>(.*?)<\/Code>/)?.[1];
      const price = parseFloat(block.match(/<TotalCharges>[\s\S]*?<MonetaryValue>(.*?)<\/MonetaryValue>/)?.[1] || '0');
      const days  = block.match(/<BusinessTransitDays>(\d+)<\/BusinessTransitDays>/)?.[1];

      return {
        service: serviceNames[code] || `UPS Service ${code}`,
        code,
        price,
        days: days ? `${days} business day${days > 1 ? 's' : ''}` : 'Varies'
      };
    }).filter(r => r.price > 0);

    rates.sort((a, b) => a.price - b.price);

    res.json({ rates, weight: totalWeight, mock: false });

  } catch (err) {
    console.error('Shipping rate error:', err.message);
    res.json({ rates: getMockRates(1), weight: 1, mock: true });
  }
});

// Helper — realistic mock rates used when UPS is unavailable
const getMockRates = (weight) => [
  { service: 'UPS Ground',       code: '03',          price: parseFloat((9.99  + weight * 0.4).toFixed(2)), days: '5-7 business days' },
  { service: 'UPS 3 Day Select', code: '12',          price: parseFloat((19.99 + weight * 0.4).toFixed(2)), days: '3 business days'   },
  { service: 'UPS 2nd Day Air',  code: '02',          price: parseFloat((29.99 + weight * 0.4).toFixed(2)), days: '2 business days'   },
  { service: 'UPS Next Day Air', code: '01',          price: parseFloat((49.99 + weight * 0.4).toFixed(2)), days: '1 business day'    }
];

// ─── Order Routes ─────────────────────────────────────────────────────────────

app.post('/api/orders', async (req, res) => {
  try {
    const {
      items, total, stripePaymentId,
      customerEmail, customerPhone,
      shippingAddress, billingAddress, sameAsBilling,
      shippingCost, shippingService
    } = req.body;

    const errors = [];
    if (!items || !Array.isArray(items) || items.length === 0) errors.push('Cart is empty');
    if (!total || typeof total !== 'number' || total <= 0)       errors.push('Invalid total amount');
    if (!stripePaymentId)                                         errors.push('Payment required');
    if (!customerEmail && !customerPhone)                         errors.push('Email or phone required');
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))
      errors.push('Invalid email format');
    if (errors.length) return res.status(400).json({ errors });

    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (_) {}
    }

    const order = await Order.create({
      userId,
      items, total, stripePaymentId,
      customerEmail, customerPhone,
      shippingAddress,
      billingAddress: sameAsBilling ? shippingAddress : billingAddress,
      sameAsBilling,
      shippingCost: shippingCost || 0,
      shippingMethod: shippingService || ''
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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