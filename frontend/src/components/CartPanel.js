import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const FREE_SHIPPING_THRESHOLD = 50;

const ShippingProgress = ({ total }) => {
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - total);
  const progress = Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100);
  const achieved = total >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="shipping-progress">
      <div className={`shipping-progress-text${achieved ? ' achieved' : ''}`}>
        {achieved ? (
          <>🎉 You've unlocked <strong>FREE shipping!</strong></>
        ) : (
          <>🚚 Add <strong>${remaining.toFixed(2)}</strong> more for FREE shipping!</>
        )}
      </div>
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

const CartPanel = () => {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const shippingFree = cartTotal >= FREE_SHIPPING_THRESHOLD;

  if (!isCartOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsCartOpen(false)} />

      <div className="cart-panel" role="dialog" aria-label="Shopping cart">

        {/* Shipping Progress */}
        <ShippingProgress total={cartTotal} />

        {/* Header */}
        <div className="cart-header">
          <div>
            <h2>Your Cart</h2>
            <div className="cart-item-count-label">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </div>
          </div>
          <button className="close-cart" onClick={() => setIsCartOpen(false)} aria-label="Close cart">
            ×
          </button>
        </div>

        {/* Items */}
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🛒</div>
              <p>Your cart is empty</p>
              <button className="continue-shopping" onClick={() => setIsCartOpen(false)}>
                Start Shopping →
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
                    <button onClick={() => updateQuantity(item._id, -1)} aria-label="Decrease quantity">−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, 1)} aria-label="Increase quantity">+</button>
                  </div>
                </div>

                <div className="cart-item-right">
                  <button
                    className="remove-item"
                    onClick={() => removeFromCart(item._id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    ×
                  </button>
                  <p className="item-subtotal">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-totals">
              <div className="cart-total-row">
                <span>Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="cart-total-row">
                <span>Shipping</span>
                <span className={shippingFree ? 'shipping-free' : ''}>
                  {shippingFree ? 'FREE 🎉' : `$${(FREE_SHIPPING_THRESHOLD - cartTotal).toFixed(2)} away`}
                </span>
              </div>
              <div className="cart-total-row main">
                <span>Total</span>
                <span className="total-amount">${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <button className="checkout-button" onClick={handleCheckout}>
              Checkout — ${cartTotal.toFixed(2)}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPanel;