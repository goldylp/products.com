const express = require('express');
const leadController = require('../controllers/lead.controller');
const { authenticateAdmin, ensureActiveAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// Public: Submit a new lead
router.post('/', leadController.createLead);

// Admin: Get all leads (temp: no auth for testing)
router.get('/', leadController.getLeads);

// Admin: Update lead status
router.put('/:id/status', leadController.updateLeadStatus);

// Admin: Delete lead
router.delete('/:id', leadController.deleteLead);

module.exports = router;