import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../images/logo.png';
import { getApiUrl } from '../utils/api';
import { isValidEmail } from '../utils/validation';

const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/admin/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to process password reset request.');
        return;
      }

      setMessage(data.message || 'Check your email for the password reset link.');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <img src={logo} alt="HealthFuel Store" className="admin-login-logo" />
        <h1 style={{ textAlign: 'center' }}>Forgot Password</h1>
        <p style={{ textAlign: 'center' }}>Enter your admin email to receive a reset link.</p>

        {error && <div className="admin-alert error">{error}</div>}
        {message && <div className="admin-alert success">{message}</div>}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          <button type="submit" className="admin-primary-btn" disabled={loading}>
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="admin-switch-text">
          Back to <Link to="/admin/login" className="admin-inline-link">admin login</Link>
        </p>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
