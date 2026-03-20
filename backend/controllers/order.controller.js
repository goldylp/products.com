const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const { sendOrderConfirmationEmail } = require('../services/email.service');
const { sendError, sendSuccess } = require('../utils/response');

const normalizeTrackingInput = (value = '') => value.trim().toUpperCase().replace(/^#/, '');

const buildTrackingFilters = (value) => {
  const normalized = normalizeTrackingInput(value);
  const shortToken = normalized.replace(/^HF-/, '');
  const filters = [];

  if (mongoose.Types.ObjectId.isValid(normalized)) {
    filters.push({ _id: normalized });
  }

  if (/^[A-F0-9]{8}$/.test(shortToken)) {
    filters.push({
      $expr: {
        $eq: [
          { $substrCP: [{ $toUpper: { $toString: '$_id' } }, 16, 8] },
          shortToken
        ]
      }
    });
  }

  return filters;
};

const sanitizeTrackedOrder = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  status: order.status || 'processing',
  createdAt: order.createdAt,
  total: order.total,
  shippingCost: order.shippingCost || 0,
  shippingMethod: order.shippingMethod || '',
  itemCount: Array.isArray(order.items) ? order.items.reduce((count, item) => count + Number(item.quantity || 0), 0) : 0,
  items: Array.isArray(order.items) ? order.items.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    image: item.image
  })) : [],
  destination: {
    city: order.shippingAddress?.city || '',
    state: order.shippingAddress?.state || '',
    country: order.shippingAddress?.country || ''
  }
});

const createOrder = async (req, res) => {
  try {
    const {
      items, total, stripePaymentId,
      customerEmail, customerPhone,
      shippingAddress, billingAddress, sameAsBilling,
      shippingCost, shippingService
    } = req.body;

    const errors = [];
    if (!items || !Array.isArray(items) || items.length === 0) errors.push('Cart is empty');
    if (!total || typeof total !== 'number' || total <= 0) errors.push('Invalid total amount');
    if (!stripePaymentId) errors.push('Payment required');
    if (!customerEmail && !customerPhone) errors.push('Email or phone required');
    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) errors.push('Invalid email format');
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
      items,
      total,
      stripePaymentId,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress: sameAsBilling ? shippingAddress : billingAddress,
      sameAsBilling,
      shippingCost: shippingCost || 0,
      shippingMethod: shippingService || ''
    });

    if (customerEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendOrderConfirmationEmail(order);
        console.log(`Order confirmation email sent to: ${customerEmail}`);
      } catch (emailErr) {
        console.error('Failed to send order confirmation email:', emailErr.message);
      }
    }

    return sendSuccess(res, order, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, deletedAt: null });
    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const trackOrder = async (req, res) => {
  try {
    const filters = buildTrackingFilters(req.params.orderNumber || req.query.orderNumber || '');
    if (!filters.length) return sendError(res, 400, 'Please provide a valid order number');

    const order = await Order.findOne({
      deletedAt: null,
      $or: filters
    });

    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, sanitizeTrackedOrder(order));
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const getMyOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
    const skip = (page - 1) * limit;

    const [orders, totalOrders] = await Promise.all([
      Order.find({ userId: req.userId, deletedAt: null }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Order.countDocuments({ userId: req.userId, deletedAt: null })
    ]);

    const totalPages = Math.max(Math.ceil(totalOrders / limit), 1);

    return sendSuccess(res, {
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
    return sendError(res, 500, err.message);
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.userId,
      deletedAt: null
    });

    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  createOrder,
  getOrderById,
  trackOrder,
  getMyOrders,
  getMyOrderById
};
