const bcrypt = require('bcryptjs');
const Product = require('../models/product.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const AdminUser = require('../models/adminUser.model');
const { ACTIVE_RECORD_FILTER } = require('../config/constants');
const { saveBase64Image } = require('../services/upload.service');
const { sendError, sendSuccess } = require('../utils/response');
const { validateProductPayload, validateCustomerPayload, validateAdminUserPayload } = require('../validators/admin.validator');

const uploadImage = async (req, res) => {
  try {
    const { imageData, fileName, folder } = req.body;
    if (!imageData) return sendError(res, 400, 'Image data is required');

    const allowedFolders = { product: 'products', admin: 'admins' };
    const relativePath = saveBase64Image(imageData, {
      folder: allowedFolders[folder] || 'misc',
      fileName: fileName || 'image'
    });

    return sendSuccess(res, { imageUrl: `${req.protocol}://${req.get('host')}${relativePath}` }, 201);
  } catch (err) {
    return sendError(res, 400, err.message);
  }
};

const listProducts = async (req, res) => {
  try {
    const products = await Product.find(ACTIVE_RECORD_FILTER).sort({ createdAt: -1 });
    return sendSuccess(res, products);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const createProduct = async (req, res) => {
  try {
    const validation = validateProductPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { data } = validation;
    const product = await Product.create({
      name: data.name,
      image: data.image,
      price: data.price,
      weight: data.weight || 1,
      category: data.category || 'General',
      badge: data.badge || '',
      description: data.description || '',
      stock: data.stock || 0,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true
    });

    return sendSuccess(res, product, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const updateProduct = async (req, res) => {
  try {
    const validation = validateProductPayload(req.body, { partial: true });
    if (validation.error) return sendError(res, 400, validation.error);

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      validation.data,
      { new: true, runValidators: true }
    );

    if (!product) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, product);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!product) return sendError(res, 404, 'Product not found');
    return sendSuccess(res, { success: true, deletedAt: product.deletedAt });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const listCustomers = async (req, res) => {
  try {
    const customers = await User.find(ACTIVE_RECORD_FILTER)
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires')
      .sort({ createdAt: -1 })
      .lean();

    const orderStats = await Order.aggregate([
      { $match: { userId: { $ne: null }, deletedAt: null } },
      { $group: { _id: '$userId', orderCount: { $sum: 1 }, totalSpent: { $sum: '$total' } } }
    ]);

    const statsMap = new Map(orderStats.map((item) => [String(item._id), item]));
    const results = customers.map((customer) => {
      const stats = statsMap.get(String(customer._id));
      return {
        ...customer,
        cartCount: customer.cart?.length || 0,
        orderCount: stats?.orderCount || 0,
        totalSpent: stats?.totalSpent || 0
      };
    });

    return sendSuccess(res, results);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const updateCustomer = async (req, res) => {
  try {
    const validation = validateCustomerPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedName, normalizedEmail } = validation;
    const existingCustomer = await User.findOne({
      email: normalizedEmail,
      deletedAt: null,
      _id: { $ne: req.params.id }
    }).select('_id');
    if (existingCustomer) return sendError(res, 400, 'Customer email already exists');

    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { name: normalizedName, email: normalizedEmail },
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires');

    if (!customer) return sendError(res, 404, 'Customer not found');
    return sendSuccess(res, customer);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await User.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!customer) return sendError(res, 404, 'Customer not found');

    await Order.updateMany({ userId: req.params.id, deletedAt: null }, { $set: { userId: null } });
    return sendSuccess(res, { success: true, deletedAt: customer.deletedAt });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const listOrders = async (req, res) => {
  try {
    const orders = await Order.find(ACTIVE_RECORD_FILTER).sort({ createdAt: -1 });
    return sendSuccess(res, orders);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const updateOrder = async (req, res) => {
  try {
    const { status, shippingMethod, shippingCost, customerEmail, customerPhone } = req.body;
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { status, shippingMethod, shippingCost, customerEmail, customerPhone },
      { new: true, runValidators: true }
    );

    if (!order) return sendError(res, 404, 'Order not found');
    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await AdminUser.find(ACTIVE_RECORD_FILTER)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });
    return sendSuccess(res, users);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const createUser = async (req, res) => {
  try {
    const validation = validateAdminUserPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedName, normalizedEmail, normalizedProfileImage, role } = validation;
    const { password } = req.body;

    const existing = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    if (existing) return sendError(res, 400, 'Admin email already exists');

    const admin = await AdminUser.create({
      name: normalizedName,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      profileImage: normalizedProfileImage,
      role
    });

    return sendSuccess(res, {
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      profileImage: admin.profileImage || '',
      role: admin.role,
      createdAt: admin.createdAt
    }, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const updateUser = async (req, res) => {
  try {
    const validation = validateAdminUserPayload(req.body, { partial: true });
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedName, normalizedEmail, normalizedProfileImage, role } = validation;
    const { password } = req.body;

    const existingAdmin = await AdminUser.findOne({
      email: normalizedEmail,
      deletedAt: null,
      _id: { $ne: req.params.id }
    }).select('_id');
    if (existingAdmin) return sendError(res, 400, 'Admin email already exists');

    const updates = {
      name: normalizedName,
      email: normalizedEmail,
      profileImage: normalizedProfileImage,
      role
    };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const admin = await AdminUser.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      updates,
      { new: true, runValidators: true }
    ).select('-password -resetPasswordToken -resetPasswordExpires');

    if (!admin) return sendError(res, 404, 'Admin user not found');
    return sendSuccess(res, admin);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const deleteUser = async (req, res) => {
  try {
    if (String(req.adminId) === String(req.params.id)) {
      return sendError(res, 400, 'You cannot delete your own admin account');
    }

    const adminCount = await AdminUser.countDocuments(ACTIVE_RECORD_FILTER);
    if (adminCount <= 1) {
      return sendError(res, 400, 'At least one admin user must remain');
    }

    const admin = await AdminUser.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      { deletedAt: new Date() },
      { new: true }
    );
    if (!admin) return sendError(res, 404, 'Admin user not found');

    return sendSuccess(res, { success: true, deletedAt: admin.deletedAt });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  uploadImage,
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  listCustomers,
  updateCustomer,
  deleteCustomer,
  listOrders,
  updateOrder,
  listUsers,
  createUser,
  updateUser,
  deleteUser
};
