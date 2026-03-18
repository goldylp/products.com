import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { isValidEmail } from '../utils/validation';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    setResetUrl('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
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
      setResetUrl(data.resetUrl || '');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Forgot Password</h1>
        <p className="auth-subtitle">Enter your email to generate a reset link</p>

        {error && <div className="auth-error">{error}</div>}
        {message && <div className="auth-success">{message}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Generating link...' : 'Send Reset Link'}
          </button>
        </form>

        {resetUrl && (
          <div className="auth-note">
            Development reset link: <a href={resetUrl} className="auth-inline-link">{resetUrl}</a>
          </div>
        )}

        <p className="auth-switch">
          Remembered your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
