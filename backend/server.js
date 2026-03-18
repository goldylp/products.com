const express = require('express');
const fs = require('fs');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const Stripe = require('stripe');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger');
require('dotenv').config();

const app = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const IMAGE_MIME_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerDocument);
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/products_store';

const sanitizeFilename = (value = 'image') => (
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'image'
);

const saveBase64Image = (imageData, { folder = 'misc', fileName = 'image' } = {}) => {
  const match = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  const [, mimeType, base64Payload] = match;
  const extension = IMAGE_MIME_EXTENSIONS[mimeType];
  if (!extension) {
    throw new Error('Only JPG, PNG, WEBP and GIF images are supported');
  }

  const buffer = Buffer.from(base64Payload, 'base64');
  if (!buffer.length) {
    throw new Error('Image file is empty');
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Image must be smaller than 5MB');
  }

  const safeFolder = sanitizeFilename(folder);
  const safeFileName = sanitizeFilename(fileName.replace(/\.[^/.]+$/, ''));
  const targetDir = path.join(UPLOADS_DIR, safeFolder);
  fs.mkdirSync(targetDir, { recursive: true });

  const storedFileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeFileName}.${extension}`;
  fs.writeFileSync(path.join(targetDir, storedFileName), buffer);

  return `/uploads/${safeFolder}/${storedFileName}`;
};

// ─── Schemas & Models ─────────────────────────────────────────────────────────

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  image:       { type: String, required: true },
  price:       { type: Number, required: true },
  weight:      { type: Number, default: 1 },
  category:    { type: String, default: 'General' },
  description: { type: String, default: '' },
  stock:       { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
  deletedAt:   { type: Date, default: null }
});
const Product = mongoose.model('Product', productSchema);

const userSchema = new mongoose.Schema({
  name:                 { type: String, required: true },
  email:                { type: String, required: true, unique: true, lowercase: true },
  password:             { type: String, required: true },
  isEmailVerified:      { type: Boolean, default: false },
  emailVerificationToken:   { type: String, default: null },
  emailVerificationExpires: { type: Date, default: null },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  cart:                 [{
    productId: String,
    name:      String,
    price:     Number,
    quantity:  Number,
    image:     String,
    _id:       String
  }],
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
});
const User = mongoose.model('User', userSchema);

const adminUserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  password:  { type: String, required: true },
  profileImage: { type: String, default: '' },
  role:      { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
  resetPasswordToken:   { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
});
const AdminUser = mongoose.model('AdminUser', adminUserSchema);

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
const Order = mongoose.model('Order', orderSchema);

const ACTIVE_RECORD_FILTER = { deletedAt: null };

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

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No admin token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired admin token' });
  }
};

const ensureActiveUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId, deletedAt: null }).select('_id');
    if (!user) {
      return res.status(401).json({ error: 'User account not available' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const ensureActiveAdmin = async (req, res, next) => {
  try {
    const admin = await AdminUser.findOne({ _id: req.adminId, deletedAt: null }).select('_id');
    if (!admin) {
      return res.status(401).json({ error: 'Admin account not available' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  return {
    token,
    hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000)
  };
};

const getHashedResetToken = (token = '') => crypto.createHash('sha256').update(token).digest('hex');
const getHashedVerificationToken = (token = '') => crypto.createHash('sha256').update(token).digest('hex');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPLOADS_PATH_REGEX = /^\/uploads\/.+/i;

const normalizeText = (value = '') => String(value).trim();
const normalizeEmail = (value = '') => normalizeText(value).toLowerCase();
const isValidEmail = (value = '') => EMAIL_REGEX.test(normalizeEmail(value));
const isValidImageReference = (value = '') => {
  const normalized = normalizeText(value);
  return /^https?:\/\/\S+$/i.test(normalized) || UPLOADS_PATH_REGEX.test(normalized);
};
const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

// ─── Email Transporter ───────────────────────────────────────────────────────
const createEmailTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: port,
    secure: port === 465, // Use SSL for port 465, TLS for others
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const getEmailLogoUrl = () => process.env.EMAIL_LOGO_URL || `${getFrontendUrl()}/logo.png`;

const renderEmailLayout = ({ preheader, title, subtitle, bodyHtml, buttonLabel, buttonUrl, footerNote }) => {
  const logoUrl = getEmailLogoUrl();

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="margin:0; padding:0; background:#f4f7fb; font-family:Arial, sans-serif; color:#1f2937;">
        <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader || ''}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb; padding:32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 18px 50px rgba(15,23,42,0.08);">
                <tr>
                  <td style="padding:18px 32px; background:#ffffff; border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:middle; line-height:0;">
                    <div style="display:inline-block; padding:6px 10px; background:#ffffff; border-radius:14px;">
                      <img src="${logoUrl}" alt="HealthFuel Store" width="96" style="width:96px; max-width:96px; height:auto; display:block; margin:0 auto; border:0; outline:none; text-decoration:none;">
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px;">
                    <h1 style="margin:0 0 12px; font-size:28px; line-height:1.2; color:#111827;">${title}</h1>
                    <p style="margin:0 0 24px; font-size:16px; line-height:1.7; color:#4b5563;">${subtitle}</p>
                    ${bodyHtml}
                    ${buttonUrl && buttonLabel ? `
                      <div style="margin:28px 0 0;">
                        <a href="${buttonUrl}" style="display:inline-block; padding:14px 24px; border-radius:12px; background:#16a34a; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700;">
                          ${buttonLabel}
                        </a>
                      </div>
                    ` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center; vertical-align:middle;">
                    <p style="margin:0; font-size:14px; font-weight:700; color:#111827;">HealthFuel Store</p>
                    <p style="margin:8px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                      ${footerNote || 'Premium supplements for serious athletes and everyday health enthusiasts.'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const sendPasswordResetEmail = async (email, resetUrl, options = {}) => {
  const transporter = createEmailTransporter();
  const {
    subject = 'Password Reset Request',
    preheader = 'Reset your HealthFuel Store password.',
    title = 'Reset your password',
    subtitle = 'We received a request to reset your HealthFuel Store account password.',
    footerNote = 'Need help? Contact HealthFuel Store support for assistance with your account.'
  } = options;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject,
    html: renderEmailLayout({
      preheader,
      title,
      subtitle,
      bodyHtml: `
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#f9fafb;">
          <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#374151;">
            Use the button below to choose a new password. For security, this link will expire in 1 hour or immediately after it is used.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
            If this link has already been used or has expired, request a new reset email. If you did not request this reset, you can safely ignore this email.
          </p>
        </div>
        <p style="margin:24px 0 0; font-size:13px; line-height:1.7; color:#6b7280; word-break:break-word;">
          If the button does not work, copy and paste this link into your browser:<br>
          <span style="color:#16a34a;">${resetUrl}</span>
        </p>
      `,
      buttonLabel: 'Reset Password',
      buttonUrl: resetUrl,
      footerNote
    })
  };

  await transporter.sendMail(mailOptions);
};

const sendEmailVerificationEmail = async (email, verificationUrl, name = 'Customer') => {
  const transporter = createEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your HealthFuel Store Account',
    html: renderEmailLayout({
      preheader: 'Verify your HealthFuel Store email address.',
      title: 'Verify your email',
      subtitle: `Welcome to HealthFuel Store, ${name}. Please confirm your email address to activate your account.`,
      bodyHtml: `
        <div style="padding:20px; border:1px solid #e5e7eb; border-radius:18px; background:#f9fafb;">
          <p style="margin:0 0 12px; font-size:15px; line-height:1.7; color:#374151;">
            Your account has been created successfully. To finish setup and sign in, please verify your email address using the button below.
          </p>
          <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
            This verification link will expire in 24 hours. Please use it before it expires so you can activate your account and sign in.
          </p>
        </div>
        <p style="margin:24px 0 0; font-size:13px; line-height:1.7; color:#6b7280; word-break:break-word;">
          If the button does not work, copy and paste this link into your browser:<br>
          <span style="color:#16a34a;">${verificationUrl}</span>
        </p>
      `,
      buttonLabel: 'Verify Email',
      buttonUrl: verificationUrl,
      footerNote: 'Your HealthFuel Store account must be verified before you can sign in.'
    })
  };

  await transporter.sendMail(mailOptions);
};

const sendOrderConfirmationEmail = async (order) => {
  const transporter = createEmailTransporter();
  const frontendUrl = getFrontendUrl();
  const orderUrl = `${frontendUrl}/order-confirmation/${order._id}`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb;">
        <img src="${item.image}" alt="${item.name}" style="width:56px; height:56px; object-fit:cover; border-radius:10px; display:block;">
      </td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#111827; font-weight:600;">${item.name}</td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#4b5563;">${item.quantity}</td>
      <td style="padding:14px 12px; border-bottom:1px solid #e5e7eb; color:#111827; font-weight:700;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  const subtotal = (order.total - (order.shippingCost || 0)).toFixed(2);
  const shipping = (order.shippingCost || 0).toFixed(2);
  const shippingAddressLines = [
    order.shippingAddress?.fullName,
    order.shippingAddress?.addressLine1,
    order.shippingAddress?.addressLine2,
    [
      order.shippingAddress?.city,
      order.shippingAddress?.state,
      order.shippingAddress?.zipCode
    ].filter(Boolean).join(', '),
    order.shippingAddress?.country
  ].filter(Boolean).join('<br>');

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: order.customerEmail,
    subject: `Order Confirmed - #${order._id}`,
    html: renderEmailLayout({
      preheader: `Your HealthFuel Store order #${order._id} has been confirmed.`,
      title: 'Order confirmed',
      subtitle: 'Thank you for your order. We have received it and will begin processing it shortly.',
      bodyHtml: `
        <div style="display:flex; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
          <div style="flex:1 1 180px; padding:16px 18px; border-radius:16px; background:#f9fafb; border:1px solid #e5e7eb;">
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">Order ID</div>
            <div style="font-size:16px; font-weight:700; color:#111827;">#${order._id}</div>
          </div>
          <div style="flex:1 1 180px; padding:16px 18px; border-radius:16px; background:#f9fafb; border:1px solid #e5e7eb;">
            <div style="font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:#6b7280; margin-bottom:6px;">Order Date</div>
            <div style="font-size:16px; font-weight:700; color:#111827;">${new Date(order.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px; border:1px solid #e5e7eb; border-radius:18px; overflow:hidden;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Product</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Name</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Qty</th>
              <th style="padding:14px 12px; text-align:left; color:#6b7280; font-size:12px; text-transform:uppercase; letter-spacing:0.06em;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div style="display:flex; flex-wrap:wrap; gap:18px;">
          <div style="flex:1 1 260px; padding:20px; border-radius:18px; background:#f9fafb; border:1px solid #e5e7eb;">
            <h3 style="margin:0 0 12px; font-size:18px; color:#111827;">Shipping Address</h3>
            <p style="margin:0; font-size:14px; line-height:1.8; color:#4b5563;">${shippingAddressLines}</p>
          </div>
          <div style="flex:1 1 220px; padding:20px; border-radius:18px; background:#111827; color:#ffffff;">
            <h3 style="margin:0 0 12px; font-size:18px;">Order Summary</h3>
            <p style="margin:0 0 8px; font-size:14px; color:#d1d5db;">Subtotal: <strong style="color:#ffffff;">$${subtotal}</strong></p>
            <p style="margin:0 0 8px; font-size:14px; color:#d1d5db;">Shipping: <strong style="color:#ffffff;">$${shipping}</strong></p>
            <p style="margin:14px 0 0; padding-top:14px; border-top:1px solid rgba(255,255,255,0.16); font-size:18px; font-weight:700;">Total: $${order.total.toFixed(2)}</p>
          </div>
        </div>
      `,
      buttonLabel: 'View Order',
      buttonUrl: orderUrl,
      footerNote: 'HealthFuel Store will keep you updated as your order moves through processing and shipment.'
    })
  };

  await transporter.sendMail(mailOptions);
};

// ─── Seed Products ────────────────────────────────────────────────────────────
const seedProducts = async () => {
  const productCount = await Product.countDocuments(ACTIVE_RECORD_FILTER);
  if (productCount > 0) {
    return;
  }

  const products = [
    { name: 'Whey Protein Isolate - 5lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 79.99, category: 'Protein', description: 'Fast-absorbing isolate formula for lean muscle support.', stock: 40 },
    { name: 'Pre-Workout Energy - 30 Servings', image: 'https://images.unsplash.com/photo-1546483875-ad9014c88eba?w=400', price: 49.99, category: 'Pre-Workout', description: 'Clean energy blend for focus and endurance.', stock: 32 },
    { name: 'Creatine Monohydrate - 60 Caps', image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', price: 29.99, category: 'Performance', description: 'Micronized creatine support for strength and power.', stock: 58 },
    { name: 'Multi-Vitamin Complex', image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=400', price: 34.99, category: 'Vitamins', description: 'Daily micronutrient support for active lifestyles.', stock: 44 },
    { name: 'BCAA Recovery - 40 Servings', image: 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400', price: 39.99, category: 'Recovery', description: 'Essential amino acids to support recovery and hydration.', stock: 26 },
    { name: 'Casein Protein - 2lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 54.99, category: 'Protein', description: 'Slow-digesting protein ideal for overnight recovery.', stock: 18 },
    { name: 'L-Glutamine - 60 Servings', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400', price: 27.99, category: 'Recovery', description: 'Recovery-focused glutamine formula for intense training.', stock: 50 },
    { name: 'Fish Oil Omega-3 - 90 Caps', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', price: 24.99, category: 'Vitamins', description: 'Omega-3 softgels for heart, joint, and brain support.', stock: 70 },
    { name: 'Beta-Alanine - 60 Caps', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400', price: 22.99, category: 'Performance', description: 'Buffers fatigue and helps extend training output.', stock: 28 },
    { name: 'Mass Gainer - 6lbs', image: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=400', price: 69.99, category: 'Protein', description: 'High-calorie formula for mass and strength goals.', stock: 20 },
    { name: 'ZMA Sleep Support', image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?w=400', price: 26.99, category: 'Recovery', description: 'Nighttime mineral blend to support rest and recovery.', stock: 34 },
    { name: 'Vegan Protein - 2lbs', image: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400', price: 44.99, category: 'Protein', description: 'Plant-based protein blend with smooth texture and taste.', stock: 24 }
  ];
  await Product.insertMany(products);
  console.log('Products seeded successfully');
};

const seedAdminUser = async () => {
  const adminCount = await AdminUser.countDocuments(ACTIVE_RECORD_FILTER);
  if (adminCount > 0) {
    return;
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@healthfuel.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'admin123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  await AdminUser.create({
    name: process.env.ADMIN_NAME || 'Super Admin',
    email,
    password: hashedPassword,
    role: 'super_admin'
  });

  console.log(`Default admin created: ${email}`);
};

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedName || !normalizedEmail || !password)
      return res.status(400).json({ error: 'Name, email and password are required' });
    if (!isValidEmail(normalizedEmail))
      return res.status(400).json({ error: 'Please enter a valid email address' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const existing = await User.findOne({ email: normalizedEmail, deletedAt: null });
    if (existing)
      return res.status(400).json({ error: 'Email already registered' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = getHashedVerificationToken(verificationToken);
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      emailVerificationToken: hashedVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const verificationUrl = `${getFrontendUrl()}/verify-email/${verificationToken}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendEmailVerificationEmail(user.email, verificationUrl, user.name);
      console.log(`Verification email sent to: ${user.email}`);
    } else {
      console.log(`Email verification link for ${user.email}: ${verificationUrl}`);
    }

    res.status(201).json({
      message: 'Account created successfully. Please verify your email before signing in.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (!isValidEmail(normalizedEmail))
      return res.status(400).json({ error: 'Please enter a valid email address' });
    const user = await User.findOne({ email: normalizedEmail, deletedAt: null });
    if (!user)
      return res.status(400).json({ error: 'Invalid email or password' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: 'Invalid email or password' });
    if (!user.isEmailVerified)
      return res.status(403).json({ error: 'Your account is not verified yet' });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email }, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, ensureActiveUser, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, deletedAt: null }).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user, cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification link is invalid or expired' });
    }

    const hashedToken = getHashedVerificationToken(token);
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
      deletedAt: null
    });

    if (!user) {
      return res.status(400).json({ error: 'Verification link is invalid or expired' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const user = await User.findOne({ email: normalizedEmail, deletedAt: null });
    const message = 'Reset password link has been sent to your email.';

    if (!user) {
      return res.json({ message });
    }

    const { token, hashedToken, expiresAt } = createPasswordResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    // Send email with reset link
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendPasswordResetEmail(user.email, resetUrl);
      console.log(`Password reset email sent to: ${user.email}`);
    } else {
      console.log(`Password reset link for ${user.email}: ${resetUrl}`);
    }

    res.json({ message });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset password link has expired. Please request a new one.' });
    }

    const hashedToken = getHashedResetToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    }).select('_id');

    if (!user) {
      return res.status(400).json({ error: 'Reset password link has expired. Please request a new one.' });
    }

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password and confirm password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hashedToken = getHashedResetToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Reset token is invalid or expired' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Cart Sync Routes ─────────────────────────────────────────────────────────

app.post('/api/cart/sync', authenticate, ensureActiveUser, async (req, res) => {
  try {
    const { cart } = req.body;
    await User.findByIdAndUpdate(req.userId, { cart });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cart', authenticate, ensureActiveUser, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, deletedAt: null }).select('cart');
    res.json({ cart: user.cart || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Product Routes ───────────────────────────────────────────────────────────

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null, isActive: { $ne: false } }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Payment Routes ───────────────────────────────────────────────────────────

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!isPositiveNumber(amount)) {
      return res.status(400).json({ error: 'A valid payment amount is required' });
    }
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
        const activeUser = await User.findOne({ _id: decoded.userId, deletedAt: null }).select('_id');
        userId = activeUser?._id || null;
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

    // Send order confirmation email
    if (customerEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendOrderConfirmationEmail(order);
        console.log(`Order confirmation email sent to: ${customerEmail}`);
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr.message);
      }
    }

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/my-orders', authenticate, ensureActiveUser, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId: req.userId, deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ userId: req.userId, deletedAt: null })
    ]);

    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

    res.json({
      orders,
      pagination: {
        page,
        limit,
        totalOrders,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.post('/api/admin/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const admin = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    if (!admin) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { adminId: admin._id, type: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage || '',
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const admin = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    const message = 'Reset password link has been sent to your email.';

    if (!admin) {
      return res.json({ message });
    }

    const { token, hashedToken, expiresAt } = createPasswordResetToken();
    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpires = expiresAt;
    await admin.save();

    const resetUrl = `${getFrontendUrl()}/admin/reset-password/${token}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendPasswordResetEmail(admin.email, resetUrl, {
        subject: 'Admin Password Reset Request',
        preheader: 'Reset your HealthFuel Admin password.',
        title: 'Reset your admin password',
        subtitle: 'We received a request to reset your HealthFuel Admin account password.',
        footerNote: 'If you need help accessing the admin panel, contact HealthFuel Store support.'
      });
      console.log(`Admin password reset email sent to: ${admin.email}`);
    } else {
      console.log(`Admin password reset link for ${admin.email}: ${resetUrl}`);
    }

    res.json({ message });
  } catch (err) {
    console.error('Admin forgot password error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/auth/validate-reset-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Reset password link has expired. Please request a new one.' });
    }

    const hashedToken = getHashedResetToken(token);
    const admin = await AdminUser.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    }).select('_id');

    if (!admin) {
      return res.status(400).json({ error: 'Reset password link has expired. Please request a new one.' });
    }

    res.json({ valid: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/auth/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Token, password and confirm password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const hashedToken = getHashedResetToken(token);
    const admin = await AdminUser.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    });

    if (!admin) {
      return res.status(400).json({ error: 'Reset token is invalid or expired' });
    }

    admin.password = await bcrypt.hash(password, 10);
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;
    await admin.save();

    res.json({ message: 'Admin password reset successful. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/auth/me', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ _id: req.adminId, deletedAt: null }).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json({
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage || '',
        role: admin.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/upload-image', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { imageData, fileName, folder } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const allowedFolders = {
      product: 'products',
      admin: 'admins'
    };

    const relativePath = saveBase64Image(imageData, {
      folder: allowedFolders[folder] || 'misc',
      fileName: fileName || 'image'
    });

    res.status(201).json({
      imageUrl: `${req.protocol}://${req.get('host')}${relativePath}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/products', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const products = await Product.find(ACTIVE_RECORD_FILTER).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { name, image, price, weight, category, description, stock, isActive } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedImage = normalizeText(image);
    const normalizedCategory = normalizeText(category) || 'General';
    const normalizedDescription = normalizeText(description);

    if (!normalizedName || !normalizedImage || price === undefined) {
      return res.status(400).json({ error: 'Name, image and price are required' });
    }
    if (!isValidImageReference(normalizedImage)) {
      return res.status(400).json({ error: 'Please provide a valid image URL or uploaded image path' });
    }
    if (!isPositiveNumber(price)) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }
    if (weight !== undefined && weight !== '' && !isPositiveNumber(weight)) {
      return res.status(400).json({ error: 'Weight must be greater than 0' });
    }
    if (stock !== undefined && stock !== '' && !isNonNegativeNumber(stock)) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }

    const product = await Product.create({
      name: normalizedName,
      image: normalizedImage,
      price: Number(price),
      weight: Number(weight) || 1,
      category: normalizedCategory,
      description: normalizedDescription,
      stock: Number(stock) || 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.name !== undefined) {
      updates.name = normalizeText(updates.name);
      if (!updates.name) {
        return res.status(400).json({ error: 'Product name is required' });
      }
    }
    if (updates.image !== undefined) {
      updates.image = normalizeText(updates.image);
      if (!updates.image || !isValidImageReference(updates.image)) {
        return res.status(400).json({ error: 'Please provide a valid image URL or uploaded image path' });
      }
    }
    if (updates.price !== undefined) updates.price = Number(updates.price);
    if (updates.weight !== undefined) updates.weight = Number(updates.weight) || 1;
    if (updates.stock !== undefined) updates.stock = Number(updates.stock) || 0;
    if (updates.category !== undefined) updates.category = normalizeText(updates.category) || 'General';
    if (updates.description !== undefined) updates.description = normalizeText(updates.description);
    if (updates.price !== undefined && !isPositiveNumber(updates.price)) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }
    if (req.body.weight !== undefined && !isPositiveNumber(req.body.weight)) {
      return res.status(400).json({ error: 'Weight must be greater than 0' });
    }
    if (req.body.stock !== undefined && !isNonNegativeNumber(req.body.stock)) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }

    const product = await Product.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, updates, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ success: true, deletedAt: product.deletedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/customers', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const customers = await User.find(ACTIVE_RECORD_FILTER).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires').sort({ createdAt: -1 }).lean();
    const orderStats = await Order.aggregate([
      { $match: { userId: { $ne: null }, deletedAt: null } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);

    const statsMap = new Map(orderStats.map(item => [String(item._id), item]));
    const results = customers.map(customer => {
      const stats = statsMap.get(String(customer._id));
      return {
        ...customer,
        cartCount: customer.cart?.length || 0,
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/customers/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { name, email } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    const existingCustomer = await User.findOne({
      email: normalizedEmail,
      deletedAt: null,
      _id: { $ne: req.params.id }
    }).select('_id');
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer email already exists' });
    }
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name: normalizedName, email: normalizedEmail },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires');

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/customers/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    await Order.updateMany({ userId: req.params.id, deletedAt: null }, { $set: { userId: null } });
    res.json({ success: true, deletedAt: customer.deletedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/orders', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const orders = await Order.find(ACTIVE_RECORD_FILTER).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { status, shippingMethod, shippingCost, customerEmail, customerPhone } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status, shippingMethod, shippingCost, customerEmail, customerPhone },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const users = await AdminUser.find(ACTIVE_RECORD_FILTER).select('-password -resetPasswordToken -resetPasswordExpires').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { name, email, password, role, profileImage } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedProfileImage = normalizeText(profileImage);

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['admin', 'super_admin'].includes(role || 'admin')) {
      return res.status(400).json({ error: 'Please select a valid admin role' });
    }
    if (normalizedProfileImage && !isValidImageReference(normalizedProfileImage)) {
      return res.status(400).json({ error: 'Please provide a valid profile image URL or uploaded image path' });
    }

    const existing = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    if (existing) {
      return res.status(400).json({ error: 'Admin email already exists' });
    }

    const admin = await AdminUser.create({
      name: normalizedName,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      profileImage: normalizedProfileImage,
      role: role || 'admin'
    });

    res.status(201).json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      profileImage: admin.profileImage || '',
      role: admin.role,
      createdAt: admin.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    const { name, email, password, role, profileImage } = req.body;
    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeEmail(email);
    const normalizedProfileImage = normalizeText(profileImage);
    if (!normalizedName || !normalizedEmail) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }
    if (password && password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!['admin', 'super_admin'].includes(role || 'admin')) {
      return res.status(400).json({ error: 'Please select a valid admin role' });
    }
    if (normalizedProfileImage && !isValidImageReference(normalizedProfileImage)) {
      return res.status(400).json({ error: 'Please provide a valid profile image URL or uploaded image path' });
    }
    const existingAdmin = await AdminUser.findOne({
      email: normalizedEmail,
      deletedAt: null,
      _id: { $ne: req.params.id }
    }).select('_id');
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin email already exists' });
    }
    const updates = {
      name: normalizedName,
      email: normalizedEmail,
      profileImage: normalizedProfileImage,
      role: role || 'admin'
    };

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const admin = await AdminUser.findOneAndUpdate({ _id: req.params.id, deletedAt: null }, updates, {
      new: true,
      runValidators: true
    }).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json(admin);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateAdmin, ensureActiveAdmin, async (req, res) => {
  try {
    if (String(req.adminId) === String(req.params.id)) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }

    const adminCount = await AdminUser.countDocuments(ACTIVE_RECORD_FILTER);
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'At least one admin user must remain' });
    }

    const admin = await AdminUser.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    res.json({ success: true, deletedAt: admin.deletedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
    console.log('Connected to MongoDB');

    await seedProducts();
    await seedAdminUser();

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
};

startServer();
