import React, { createContext, useContext, useEffect, useState } from 'react';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('http://localhost:5000/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAdminUser(data.user))
      .catch(() => localStorage.removeItem('adminToken'))
      .finally(() => setLoading(false));
  }, []);

  const loginAdmin = (token, user) => {
    localStorage.setItem('adminToken', token);
    setAdminUser(user);
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminToken');
    setAdminUser(null);
  };

  const updateAdminUser = (updates) => {
    setAdminUser((current) => current ? { ...current, ...updates } : current);
  };

  const getAdminAuthHeader = () => {
    const token = localStorage.getItem('adminToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, loginAdmin, logoutAdmin, updateAdminUser, getAdminAuthHeader }}>
      {children}
    </AdminAuthContext.Provider>
  );
};
