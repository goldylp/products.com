const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/adminUser.model');
const { sendPasswordResetEmail, getFrontendUrl } = require('../services/email.service');
const { createPasswordResetToken, getHashedResetToken } = require('../utils/common');
const { sendError, sendSuccess } = require('../utils/response');
const { validateLoginPayload, validateForgotPasswordPayload, validateResetPasswordPayload } = require('../validators/auth.validator');

const login = async (req, res) => {
  try {
    const validation = validateLoginPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedEmail } = validation;
    const { password } = req.body;
    const admin = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    if (!admin) return sendError(res, 400, 'Invalid email or password');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return sendError(res, 400, 'Invalid email or password');

    const token = jwt.sign({ adminId: admin._id, type: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return sendSuccess(res, {
      token,
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage || '',
        role: admin.role
      }
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const validation = validateForgotPasswordPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedEmail } = validation;
    const admin = await AdminUser.findOne({ email: normalizedEmail, deletedAt: null });
    const message = 'Reset password link has been sent to your email.';
    if (!admin) return sendSuccess(res, { message });

    const { token, hashedToken, expiresAt } = createPasswordResetToken();
    admin.resetPasswordToken = hashedToken;
    admin.resetPasswordExpires = expiresAt;
    await admin.save();

    const resetUrl = `${getFrontendUrl()}/admin/reset-password/${token}`;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendPasswordResetEmail(admin.email, resetUrl, {
        subject: 'Admin Password Reset Request',
        preheader: 'Reset your HealthFuel Admin password.',
        title: 'Reset your admin password',
        subtitle: 'We received a request to reset your HealthFuel Admin account password.',
        footerNote: 'If you need help accessing the admin panel, contact HealthFuel Store support.'
      });
      console.log(`Admin password reset email sent to: ${admin.email}`);
    } else {
      console.log(`Admin password reset link for ${admin.email}: ${resetUrl}`);
    }

    return sendSuccess(res, { message });
  } catch (err) {
    console.error('Admin forgot password error:', err);
    return sendError(res, 500, err.message);
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, 400, 'Reset password link has expired. Please request a new one.');

    const admin = await AdminUser.findOne({
      resetPasswordToken: getHashedResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    }).select('_id');

    if (!admin) return sendError(res, 400, 'Reset password link has expired. Please request a new one.');
    return sendSuccess(res, { valid: true });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const resetPassword = async (req, res) => {
  try {
    const validation = validateResetPasswordPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { token, password } = validation;
    const admin = await AdminUser.findOne({
      resetPasswordToken: getHashedResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    });
    if (!admin) return sendError(res, 400, 'Reset token is invalid or expired');

    admin.password = await bcrypt.hash(password, 10);
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;
    await admin.save();

    return sendSuccess(res, { message: 'Admin password reset successful. You can now sign in.' });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const me = async (req, res) => {
  try {
    const admin = await AdminUser.findOne({ _id: req.adminId, deletedAt: null }).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!admin) return sendError(res, 404, 'Admin user not found');

    return sendSuccess(res, {
      user: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        profileImage: admin.profileImage || '',
        role: admin.role
      }
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  login,
  forgotPassword,
  validateResetToken,
  resetPassword,
  me
};
