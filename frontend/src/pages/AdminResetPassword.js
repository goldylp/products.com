import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import logo from '../images/logo.png';
import PasswordToggleIcon from '../components/PasswordToggleIcon';
import { getApiUrl } from '../utils/api';

const AdminResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [expiredMessage, setExpiredMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const validateToken = async () => {
      if (!token) {
        if (isMounted) {
          setExpiredMessage('Reset password link has expired. Please request a new one.');
          setValidatingToken(false);
        }
        return;
      }

      try {
        const res = await fetch(getApiUrl('/api/admin/auth/validate-reset-token'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setExpiredMessage(data.error || 'Reset password link has expired. Please request a new one.');
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      } catch (err) {
        if (isMounted) {
          setExpiredMessage('Unable to verify this reset link right now. Please try again.');
          setIsTokenValid(false);
        }
      } finally {
        if (isMounted) {
          setValidatingToken(false);
        }
      }
    };

    validateToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/admin/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Unable to reset password.');
        setExpiredMessage(data.error || '');
        setIsTokenValid(false);
        return;
      }

      setSuccess(data.message || 'Password reset successful.');
      setIsTokenValid(false);
      setTimeout(() => navigate('/admin/login'), 1500);
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
        <h1 style={{ textAlign: 'center' }}>Reset Password</h1>
        <p style={{ textAlign: 'center' }}>Choose a new password for your admin account.</p>

        {error && <div className="admin-alert error">{error}</div>}
        {success && <div className="admin-alert success">{success}</div>}

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <div className="admin-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <PasswordToggleIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <div className="admin-password-field">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your new password"
                required
                minLength={6}
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <PasswordToggleIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          <button type="submit" className="admin-primary-btn" disabled={loading || validatingToken || !isTokenValid}>
            {validatingToken ? 'Verifying link...' : loading ? 'Resetting password...' : 'Reset Password'}
          </button>
        </form>

        <p className="admin-switch-text">
          Back to <Link to="/admin/login" className="admin-inline-link">admin login</Link>
        </p>
      </div>

      {!validatingToken && expiredMessage && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <h3>Reset Password Link Expired</h3>
            <p className="admin-modal-text">{expiredMessage}</p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-primary-btn" onClick={() => navigate('/admin/forgot-password')}>
                Request New Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminResetPassword;
