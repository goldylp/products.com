import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;

    const verifyEmail = async () => {
      if (!token) {
        if (isMounted) {
          setError('Verification link is invalid or expired.');
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await res.json();
        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || 'Verification link is invalid or expired.');
          return;
        }

        const successMessage = data.message || 'Email verified successfully. You can now sign in.';
        setSuccess(successMessage);
        setTimeout(() => {
          navigate('/login', {
            state: { message: successMessage }
          });
        }, 1600);
      } catch (err) {
        if (isMounted) {
          setError('Unable to verify your email right now. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyEmail();

    return () => {
      isMounted = false;
    };
  }, [navigate, token]);

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Verify Email</h1>
        <p className="auth-subtitle">We are confirming your HealthFuel Store account.</p>

        {loading && <div className="auth-note">Verifying your email address...</div>}
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <p className="auth-switch">
          Back to <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
