import React, { useEffect } from 'react';
import { BrowserRouter as Router, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
import OrderDetails from './pages/OrderDetails';
import TrackOrder from './pages/TrackOrder';
import About from './pages/About';
import Contact from './pages/Contact';
import Blog from './pages/Blog';
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
          <li><Link to="/">All Products</Link></li>
          <li><Link to="/">Protein</Link></li>
          <li><Link to="/">Pre-Workout</Link></li>
          <li><Link to="/">Vitamins</Link></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">Help</div>
        <ul className="footer-links">
          <li><Link to="/contact#faq">FAQ</Link></li>
          <li><Link to="/contact">Shipping Questions</Link></li>
          <li><Link to="/contact">Returns</Link></li>
          <li><Link to="/track-order">Track Order</Link></li>
          <li><Link to="/contact">Contact Us</Link></li>
        </ul>
      </div>
      <div>
        <div className="footer-col-title">Company</div>
        <ul className="footer-links">
          <li><Link to="/about">About Us</Link></li>
          <li><Link to="/blog">Blog</Link></li>
          <li><Link to="/contact">Privacy Policy</Link></li>
          <li><Link to="/contact">Terms of Service</Link></li>
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

  useEffect(() => {
    document.title = isAdminRoute ? 'HealthFuel Admin' : 'HealthFuel Store';
  }, [isAdminRoute, location.pathname]);

  return (
    <div className="app">
      {!isAdminRoute && <Header />}
      <main className={isAdminRoute ? 'admin-main-content' : 'main-content'}>
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/my-orders/:orderId" element={<OrderDetails />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/track-order/:orderNumber" element={<TrackOrder />} />
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
