import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CartPanel = () => {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, isCartOpen, setIsCartOpen } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  if (!isCartOpen) return null;

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsCartOpen(false)}></div>
      <div className="cart-panel">
        <div className="cart-header">
          <h2>Shopping Cart</h2>
          <button className="close-cart" onClick={() => setIsCartOpen(false)}>×</button>
        </div>
        <div className="cart-items">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <p>Your cart is empty</p>
              <button className="continue-shopping" onClick={() => setIsCartOpen(false)}>
                Continue Shopping
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item._id} className="cart-item">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <h4>{item.name}</h4>
                  <p className="cart-item-price">${item.price.toFixed(2)}</p>
                  <div className="quantity-controls">
                    <button onClick={() => updateQuantity(item._id, -1)}>−</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, 1)}>+</button>
                  </div>
                </div>
                <button className="remove-item" onClick={() => removeFromCart(item._id)}>×</button>
                <p className="item-subtotal">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total:</span>
              <span className="total-amount">${cartTotal.toFixed(2)}</span>
            </div>
            <button className="checkout-button" onClick={handleCheckout}>
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPanel;