const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate, ensureActiveUser } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/orders', orderController.createOrder);
router.get('/orders/:id', orderController.getOrderById);
router.get('/my-orders', authenticate, ensureActiveUser, orderController.getMyOrders);

module.exports = router;
