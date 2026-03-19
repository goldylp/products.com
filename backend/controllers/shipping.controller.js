const { getShippingRates } = require('../services/shipping.service');
const { sendError, sendSuccess } = require('../utils/response');

const rates = async (req, res) => {
  try {
    const { items, address } = req.body;
    const result = await getShippingRates(items, address);
    return sendSuccess(res, result);
  } catch (err) {
    console.error('Shipping rate error:', err.message);
    return sendError(res, 400, err.message);
  }
};

module.exports = {
  rates
};
