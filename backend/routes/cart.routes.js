const express = require('express');
const cartController = require('../controllers/cart.controller');
const { authenticate, ensureActiveUser } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/sync', authenticate, ensureActiveUser, cartController.syncCart);
router.get('/', authenticate, ensureActiveUser, cartController.getCart);

module.exports = router;
