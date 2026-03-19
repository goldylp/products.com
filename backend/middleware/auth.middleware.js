const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const AdminUser = require('../models/adminUser.model');

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

module.exports = {
  authenticate,
  authenticateAdmin,
  ensureActiveUser,
  ensureActiveAdmin
};
