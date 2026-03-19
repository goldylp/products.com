const ContactMessage = require('../models/contactMessage.model');
const { normalizeEmail, normalizeText, isValidEmail } = require('../utils/common');
const { sendError, sendSuccess } = require('../utils/response');
const { sendContactNotificationEmail } = require('../services/email.service');

const submitContactMessage = async (req, res) => {
  try {
    const name = normalizeText(req.body.name);
    const email = normalizeEmail(req.body.email);
    const subject = normalizeText(req.body.subject);
    const message = normalizeText(req.body.message);

    if (!name || !email || !subject || !message) {
      return sendError(res, 400, 'Name, email, subject, and message are required');
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, 'Please enter a valid email address');
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      subject,
      message
    });

    await sendContactNotificationEmail({
      name,
      email,
      subject,
      message
    });

    return sendSuccess(res, {
      message: 'Thanks for contacting us. Our team will get back to you shortly.',
      contactId: contactMessage._id
    }, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  submitContactMessage
};
