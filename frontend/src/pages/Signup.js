import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PasswordToggleIcon from '../components/PasswordToggleIcon';
import { getApiUrl } from '../utils/api';
import { isValidEmail } from '../utils/validation';
import { getTrackingData, trackLead } from '../utils/tracking';

const Signup = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [trackingData] = useState(() => getTrackingData());

  // Submit lead to tracking API (non-blocking)
  const submitLead = async (name, email) => {
    try {
      await fetch(getApiUrl('/api/leads'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          ...trackingData,
          source: 'facebook'
        })
      });
      // Track lead event
      trackLead({ content_name: 'Signup', source: trackingData.utm_campaign || 'direct' });
    } catch (err) {
      console.error('Lead tracking error:', err);
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      // Submit lead tracking (non-blocking)
      submitLead(formData.name, formData.email);

      setSuccess(data.message || 'Account created successfully. Please verify your email before signing in.');
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Account created successfully. Please verify your email before signing in.'
          }
        });
      }, 1600);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join HealthFuel Store today</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <PasswordToggleIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <PasswordToggleIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
