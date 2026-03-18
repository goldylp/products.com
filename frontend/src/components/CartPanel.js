import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartPanel = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    isCartOpen,
    setIsCartOpen
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/checkout' && isCartOpen) {
      setIsCartOpen(false);
    }
  }, [isCartOpen, location.pathname, setIsCartOpen]);

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  if (!isCartOpen || location.pathname === '/checkout') return null;
  return (
    <>
      <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />
      <div className="cart-panel" role="dialog" aria-label="Shopping cart">
        <div className="cart-header">
          <div>
            <h2>Your Cart</h2>
            <div className="cart-item-count-label">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
          {cartItems.length > 0 ? (
            <button type="button" className="clear-cart-link" onClick={clearCart}>
              Clear cart
            </button>
          ) : (
            <button
              type="button"
              className="close-cart"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
            >
              &times;
            </button>
          )}
        </div>

        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">&#128722;</div>
              <p>Your cart is empty</p>
              <button className="continue-shopping" onClick={() => setIsCartOpen(false)}>
                Start Shopping
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item._id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />

                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p className="cart-item-price">${item.price.toFixed(2)} each</p>
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item._id, -1)} aria-label="Decrease quantity">
                      &minus;
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, 1)} aria-label="Increase quantity">
                      +
                    </button>
                  </div>
                </div>

                <div className="cart-item-right">
                  <button
                    className="remove-item"
                    onClick={() => removeFromCart(item._id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    &times;
                  </button>
                  <p className="item-subtotal">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="cart-total-row main">
                <span>Subtotal</span>
                <span className="total-amount">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button className="checkout-button" onClick={handleCheckout}>
              Proceed To Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPanel;
