import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import logo from '../images/logo.png';

const Header = () => {
  const { cartCount, setIsCartOpen } = useCart();
  const { user, logoutUser }         = useAuth();
  const navigate                     = useNavigate();
  const [menuOpen, setMenuOpen]      = useState(false);

  const handleLogout = () => {
    logoutUser();
    setMenuOpen(false);
    navigate('/');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="header">
      <div className="header-container">

        {/* Mobile: Hamburger on left */}
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
          <span className={`hamburger-line ${menuOpen ? 'open' : ''}`}></span>
        </button>

        {/* Logo — center on mobile, left on desktop */}
        <Link to="/" className="logo" onClick={closeMenu}>
          <img src={logo} alt="HealthFuel Store" className="logo-img" />
        </Link>

        {/* Desktop nav */}
        <nav className="nav">
          <Link to="/" className="nav-link">Products</Link>
          {user ? (
            <>
              <Link to="/my-orders" className="nav-link">My Orders</Link>
              <span className="nav-user">Hi, {user.name.split(' ')[0]}</span>
              <button className="nav-logout-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"  className="nav-link">Login</Link>
              <Link to="/signup" className="nav-btn">Sign Up</Link>
            </>
          )}
          <button className="cart-button" onClick={() => setIsCartOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
        </nav>

        {/* Mobile: Cart on right */}
        <button className="cart-button mobile-cart" onClick={() => setIsCartOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>

      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="mobile-menu">
          <Link to="/"          className="mobile-link" onClick={closeMenu}>Products</Link>
          {user ? (
            <>
              <Link to="/my-orders" className="mobile-link" onClick={closeMenu}>My Orders</Link>
              <span className="mobile-user">Hi, {user.name}</span>
              <button className="mobile-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"  className="mobile-link" onClick={closeMenu}>Login</Link>
              <Link to="/signup" className="mobile-link mobile-signup" onClick={closeMenu}>Sign Up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;