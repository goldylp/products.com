const Lead = require('../models/lead.model');
const { normalizeEmail, normalizeText, isValidEmail } = require('../utils/common');
const { sendError, sendSuccess } = require('../utils/response');
const { sendLeadNotificationEmail } = require('../services/email.service');

// Submit a new lead
const createLead = async (req, res) => {
  try {
    const { name, email, phone, utm_source, utm_medium, utm_campaign, fbclid, source } = req.body;

    if (!name || !email) {
      return sendError(res, 400, 'Name and email are required');
    }

    const normalizedName = normalizeText(name);
    const normalizedEmail = normalizeEmail(email);

    if (!isValidEmail(normalizedEmail)) {
      return sendError(res, 400, 'Please enter a valid email address');
    }

    const lead = await Lead.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizeText(phone) || '',
      utm_source: utm_source || '',
      utm_medium: utm_medium || '',
      utm_campaign: utm_campaign || '',
      fbclid: fbclid || '',
      source: source || 'facebook',
      status: 'new'
    });

    // Send email notification (non-blocking)
    sendLeadNotificationEmail({
      name: normalizedName,
      email: normalizedEmail,
      phone: phone || '',
      utm_campaign: utm_campaign || ''
    }).catch(err => console.error('Lead notification email error:', err));

    return sendSuccess(res, {
      message: 'Lead captured successfully',
      leadId: lead._id
    }, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// Get all leads (admin)
const getLeads = async (req, res) => {
  try {
    const { campaign, status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};

    if (campaign) {
      query.utm_campaign = campaign;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate + 'T23:59:59');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Lead.countDocuments(query)
    ]);

    // Get unique campaigns for filter dropdown
    const campaigns = await Lead.distinct('utm_campaign', { utm_campaign: { $ne: '' } });

    return sendSuccess(res, {
      leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        campaigns: campaigns.filter(c => c)
      }
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// Update lead status (admin)
const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'contacted', 'closed'].includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    const lead = await Lead.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!lead) {
      return sendError(res, 404, 'Lead not found');
    }

    return sendSuccess(res, { lead });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

// Delete lead (admin)
const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return sendError(res, 404, 'Lead not found');
    }

    return sendSuccess(res, { message: 'Lead deleted successfully' });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  createLead,
  getLeads,
  updateLeadStatus,
  deleteLead
};