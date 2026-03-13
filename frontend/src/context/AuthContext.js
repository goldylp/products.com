import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while verifying stored token

  // On app startup, check if a token exists in localStorage and verify it.
  // This is the equivalent of PHP's session_start() — it restores the session.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Verify the token is still valid with the server
    fetch('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setUser(data.user))
      .catch(() => localStorage.removeItem('token')) // token expired/invalid — clear it
      .finally(() => setLoading(false));
  }, []);

  // Called after successful login or signup.
  // Stores the token in localStorage and sets the user in state.
  const loginUser = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  // Clears everything — equivalent of session_destroy() in PHP
  const logoutUser = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // Helper to get the Authorization header for protected API calls
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginUser, logoutUser, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};