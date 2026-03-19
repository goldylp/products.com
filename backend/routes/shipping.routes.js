const express = require('express');
const shippingController = require('../controllers/shipping.controller');

const router = express.Router();

router.post('/rates', shippingController.rates);

module.exports = router;
