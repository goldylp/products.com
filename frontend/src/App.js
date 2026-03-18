import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import Header from './components/Header';
import CartPanel from './components/CartPanel';
import ProductList from './pages/ProductList';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import MyOrders from './pages/MyOrders';
import AdminLogin from './pages/AdminLogin';
import AdminForgotPassword from './pages/AdminForgotPassword';
import AdminResetPassword from './pages/AdminResetPassword';
import AdminDashboard from './pages/AdminDashboard';
import logo from './images/logo.png';
import './App.css';

const Footer = () => (
  <footer className="footer">
    <div className="footer-main">
      <div className="footer-brand">
        <img src={logo} alt="HealthFuel Store" className="footer-logo" />
        <p>
          Premium supplements for serious athletes and everyday health enthusiasts.
          Science-backed. Lab-tested. Results guaranteed.
        </p>
      </div>
      <div>
        <div className="footer-col-title">Shop</div>
        <ul className="footer-links">
          <li><a href="/">All Products</a></li>
          <li><a href="/">Protein</a></li>
          <li><a href="/">Pre-Workout</a></li>
          <li><a href="/">Vitamins</a></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">Help</div>
        <ul className="footer-links">
          <li><a href="/">FAQ</a></li>
          <li><a href="/">Shipping Policy</a></li>
          <li><a href="/">Returns</a></li>
          <li><a href="/">Track Order</a></li>
          <li><a href="/">Contact Us</a></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">Company</div>
        <ul className="footer-links">
          <li><a href="/">About Us</a></li>
          <li><a href="/">Blog</a></li>
          <li><a href="/">Privacy Policy</a></li>
          <li><a href="/">Terms of Service</a></li>
        </ul>
      </div>
    </div>
    <div className="footer-bottom">
      <p>Copyright © {new Date().getFullYear()} HealthFuel Store. All rights reserved.</p>
    </div>
  </footer>
);

const AppLayout = () => {
  const location = useLocation();
  const isAdminRoute = (
    location.pathname.startsWith('/admin')
    || location.pathname.startsWith('/dashboard')
    || location.pathname.startsWith('/products')
    || location.pathname.startsWith('/customers')
    || location.pathname.startsWith('/orders')
    || location.pathname.startsWith('/users')
  );

  return (
    <div className="app">
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? 'admin-main-content' : 'main-content'}>
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password/:token" element={<AdminResetPassword />} />
          <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/products" element={<AdminDashboard />} />
          <Route path="/products/new" element={<AdminDashboard />} />
          <Route path="/products/:id" element={<AdminDashboard />} />
          <Route path="/customers" element={<AdminDashboard />} />
          <Route path="/customers/:id" element={<AdminDashboard />} />
          <Route path="/orders" element={<AdminDashboard />} />
          <Route path="/orders/:id" element={<AdminDashboard />} />
          <Route path="/users" element={<AdminDashboard />} />
          <Route path="/users/new" element={<AdminDashboard />} />
          <Route path="/users/:id" element={<AdminDashboard />} />
        </Routes>
      </main>
      {!isAdminRoute && <CartPanel />}
      {!isAdminRoute && <Footer />}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <CartProvider>
          <Router>
            <AppLayout />
          </Router>
        </CartProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}

export default App;
