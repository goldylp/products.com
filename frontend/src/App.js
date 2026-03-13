import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider }  from './context/AuthContext';
import { CartProvider }  from './context/CartContext';
import Header            from './components/Header';
import ProductList       from './pages/ProductList';
import Checkout          from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Login             from './pages/Login';
import Signup            from './pages/Signup';
import MyOrders          from './pages/MyOrders';
import CartPanel         from './components/CartPanel';
import logo              from './images/logo.png';
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
      <p>© {new Date().getFullYear()} HealthFuel Store. All rights reserved.</p>
    </div>
  </footer>
);

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="app">
            <Header />
            <main className="main-content">
              <Routes>
                <Route path="/"                              element={<ProductList />} />
                <Route path="/checkout"                      element={<Checkout />} />
                <Route path="/order-confirmation/:orderId"   element={<OrderConfirmation />} />
                <Route path="/login"                         element={<Login />} />
                <Route path="/signup"                        element={<Signup />} />
                <Route path="/my-orders"                     element={<MyOrders />} />
              </Routes>
            </main>
            <CartPanel />
            <Footer />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;