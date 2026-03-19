const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { sendEmailVerificationEmail, sendPasswordResetEmail, getFrontendUrl } = require('../services/email.service');
const { createPasswordResetToken, getHashedResetToken, getHashedVerificationToken } = require('../utils/common');
const { sendError, sendSuccess } = require('../utils/response');
const {
  validateSignupPayload,
  validateLoginPayload,
  validateForgotPasswordPayload,
  validateResetPasswordPayload
} = require('../validators/auth.validator');

const signup = async (req, res) => {
  try {
    const validation = validateSignupPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedName, normalizedEmail } = validation;
    const { password } = req.body;

    const existing = await User.findOne({ email: normalizedEmail, deletedAt: null });
    if (existing) return sendError(res, 400, 'Email already registered');

    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      emailVerificationToken: getHashedVerificationToken(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    const verificationUrl = `${getFrontendUrl()}/verify-email/${verificationToken}`;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendEmailVerificationEmail(user.email, verificationUrl, user.name);
      console.log(`Verification email sent to: ${user.email}`);
    } else {
      console.log(`Email verification link for ${user.email}: ${verificationUrl}`);
    }

    return sendSuccess(res, { message: 'Account created successfully. Please verify your email before signing in.' }, 201);
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const login = async (req, res) => {
  try {
    const validation = validateLoginPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedEmail } = validation;
    const { password } = req.body;

    const user = await User.findOne({ email: normalizedEmail, deletedAt: null });
    if (!user) return sendError(res, 400, 'Invalid email or password');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return sendError(res, 400, 'Invalid email or password');
    if (!user.isEmailVerified) return sendError(res, 403, 'Your account is not verified yet');

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return sendSuccess(res, {
      token,
      user: { _id: user._id, name: user.name, email: user.email },
      cart: user.cart || []
    });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.userId, deletedAt: null })
      .select('-password -resetPasswordToken -resetPasswordExpires -emailVerificationToken -emailVerificationExpires');
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, { user, cart: user.cart || [] });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, 400, 'Verification link is invalid or expired');

    const user = await User.findOne({
      emailVerificationToken: getHashedVerificationToken(token),
      emailVerificationExpires: { $gt: new Date() },
      deletedAt: null
    });

    if (!user) return sendError(res, 400, 'Verification link is invalid or expired');

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    return sendSuccess(res, { message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const validation = validateForgotPasswordPayload(req.body);
    if (validation.error) return sendError(res, 400, validation.error);

    const { normalizedEmail } = validation;
    const user = await User.findOne({ email: normalizedEmail, deletedAt: null });
    const message = 'Reset password link has been sent to your email.';

    if (!user) return sendSuccess(res, { message });

    const { token, hashedToken, expiresAt } = createPasswordResetToken();
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = expiresAt;
    await user.save();

    const resetUrl = `${getFrontendUrl()}/reset-password/${token}`;
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendPasswordResetEmail(user.email, resetUrl);
      console.log(`Password reset email sent to: ${user.email}`);
    } else {
      console.log(`Password reset link for ${user.email}: ${resetUrl}`);
    }

    return sendSuccess(res, { message });
  } catch (err) {
    console.error('Forgot password error:', err);
    return sendError(res, 500, err.message);
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return sendError(res, 400, 'Reset password link has expired. Please request a new one.');

    const user = await User.findOne({
      resetPasswordToken: getHashedResetToken(token),
      resetPasswordExpires: { $gt: new Date() },
      deletedAt: null
    }).select('_id');

    if (!user) return sendError(res, 400, 'Reset password link has expired. Please request a new one.');
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
    const user = await User.findOne({
      resetPasswordToken: getHashedResetToken(token),
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) return sendError(res, 400, 'Reset token is invalid or expired');

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return sendSuccess(res, { message: 'Password reset successful. You can now sign in.' });
  } catch (err) {
    return sendError(res, 500, err.message);
  }
};

module.exports = {
  signup,
  login,
  me,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword
};
