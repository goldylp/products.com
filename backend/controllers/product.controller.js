const Product = require('../models/product.model');
const { sendError, sendSuccess } = require('../utils/response');

const listProducts = async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null, isActive: { $ne: false } }).sort({ createdAt: -1 });
    return sendSuccess(res, products);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  listProducts
};
