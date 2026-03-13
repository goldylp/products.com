import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};

export const CartProvider = ({ children }) => {
  const { user, getAuthHeader } = useAuth();

  const [cartItems, setCartItems] = useState(() => {
    // Initial load from localStorage (works for guests and as fallback)
    const savedCart = localStorage.getItem('cart');
    try { return savedCart ? JSON.parse(savedCart) : []; }
    catch { return []; }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  // ── When the user logs in, load their cart from the server ──────────────────
  // This is the key feature: replaces localStorage cart with the DB cart.
  useEffect(() => {
    if (!user) return;
    fetch('http://localhost:5000/api/cart', {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.cart && data.cart.length > 0) {
          setCartItems(data.cart);
        }
      })
      .catch(() => {}); // fail silently — localStorage cart is still available
  }, [user]); // runs every time user changes (login/logout)

  // ── Persist cart: localStorage for everyone, DB for logged-in users ─────────
  useEffect(() => {
    // Always save to localStorage (guest fallback)
    localStorage.setItem('cart', JSON.stringify(cartItems));

    // Additionally sync to MongoDB if logged in
    if (user) {
      fetch('http://localhost:5000/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ cart: cartItems })
      }).catch(() => {}); // fail silently — localStorage is the backup
    }
  }, [cartItems, user]);

  // ── Cart actions (unchanged logic) ──────────────────────────────────────────
  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item._id !== productId));
  };

  const updateQuantity = (productId, change) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item._id !== productId) return item;
        const newQty = item.quantity + change;
        return newQty <= 0 ? null : { ...item, quantity: newQty };
      }).filter(Boolean)
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('cart');
    // Also clear in DB if logged in
    if (user) {
      fetch('http://localhost:5000/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ cart: [] })
      }).catch(() => {});
    }
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, removeFromCart, updateQuantity, clearCart,
      cartTotal, cartCount, isCartOpen, setIsCartOpen
    }}>
      {children}
    </CartContext.Provider>
  );
};