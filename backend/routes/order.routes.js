const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate, ensureActiveUser } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/orders', orderController.createOrder);
router.get('/orders/:id', orderController.getOrderById);
router.get('/track-order/:orderNumber', orderController.trackOrder);
router.get('/my-orders', authenticate, ensureActiveUser, orderController.getMyOrders);
router.get('/my-orders/:id', authenticate, ensureActiveUser, orderController.getMyOrderById);

module.exports = router;
