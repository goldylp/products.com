const User = require('../models/user.model');
const { sendError, sendSuccess } = require('../utils/response');

const syncCart = async (req, res) => {
  try {
    const { cart } = req.body;
    await User.findByIdAndUpdate(req.userId, { cart });
    return sendSuccess(res, { success: true });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const getCart = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, deletedAt: null }).select('cart');
    return sendSuccess(res, { cart: user.cart || [] });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  syncCart,
  getCart
};
