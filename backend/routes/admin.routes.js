const express = require('express');
const adminAuthController = require('../controllers/adminAuth.controller');
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin, ensureActiveAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/auth/login', adminAuthController.login);
router.post('/auth/forgot-password', adminAuthController.forgotPassword);
router.post('/auth/validate-reset-token', adminAuthController.validateResetToken);
router.post('/auth/reset-password', adminAuthController.resetPassword);
router.get('/auth/me', authenticateAdmin, ensureActiveAdmin, adminAuthController.me);

router.post('/upload-image', authenticateAdmin, ensureActiveAdmin, adminController.uploadImage);

router.get('/products', authenticateAdmin, ensureActiveAdmin, adminController.listProducts);
router.post('/products', authenticateAdmin, ensureActiveAdmin, adminController.createProduct);
router.put('/products/:id', authenticateAdmin, ensureActiveAdmin, adminController.updateProduct);
router.delete('/products/:id', authenticateAdmin, ensureActiveAdmin, adminController.deleteProduct);

router.get('/customers', authenticateAdmin, ensureActiveAdmin, adminController.listCustomers);
router.put('/customers/:id', authenticateAdmin, ensureActiveAdmin, adminController.updateCustomer);
router.delete('/customers/:id', authenticateAdmin, ensureActiveAdmin, adminController.deleteCustomer);

router.get('/orders', authenticateAdmin, ensureActiveAdmin, adminController.listOrders);
router.put('/orders/:id', authenticateAdmin, ensureActiveAdmin, adminController.updateOrder);

router.get('/users', authenticateAdmin, ensureActiveAdmin, adminController.listUsers);
router.post('/users', authenticateAdmin, ensureActiveAdmin, adminController.createUser);
router.put('/users/:id', authenticateAdmin, ensureActiveAdmin, adminController.updateUser);
router.delete('/users/:id', authenticateAdmin, ensureActiveAdmin, adminController.deleteUser);

module.exports = router;
