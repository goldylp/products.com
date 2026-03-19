const Stripe = require('stripe');
const { isPositiveNumber } = require('../utils/common');
const { sendError, sendSuccess } = require('../utils/response');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!isPositiveNumber(amount)) {
      return sendError(res, 400, 'A valid payment amount is required');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      automatic_payment_methods: { enabled: true }
    });

    return sendSuccess(res, { clientSecret: paymentIntent.client_secret });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  createPaymentIntent
};
