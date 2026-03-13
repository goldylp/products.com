import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/orders/${orderId}`)
      .then(res => {
        if (!res.ok) throw new Error('Order not found');
        return res.json();
      })
      .then(data => { setOrder(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [orderId]);

  if (loading) return (
    <div className="loading">
      <div className="loading-spinner" />
      <span>Loading your order...</span>
    </div>
  );

  if (error) return <div className="error">⚠️ {error}</div>;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">

        {/* Success Icon */}
        <div className="success-icon-wrapper">
          <div className="success-icon">✓</div>
        </div>

        <h1>Order Confirmed!</h1>
        <p className="order-message">
          Thank you for your purchase! We'll send a confirmation to{' '}
          {order.customerEmail ? <strong>{order.customerEmail}</strong> : 'your email'}.
        </p>

        {/* Order Details */}
        <div className="order-details">
          <div className="detail-row">
            <span className="detail-label">Order ID</span>
            <span className="detail-value" title={order._id}>#{order._id.slice(-8).toUpperCase()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">{orderDate}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment</span>
            <span className="detail-value">
              <span style={{ color: '#00B894', fontWeight: 700 }}>✓ Paid via Stripe</span>
            </span>
          </div>
          {order.customerEmail && (
            <div className="detail-row">
              <span className="detail-label">Email</span>
              <span className="detail-value">{order.customerEmail}</span>
            </div>
          )}
          {order.shippingAddress && (
            <div className="detail-row">
              <span className="detail-label">Ships to</span>
              <span className="detail-value">
                {order.shippingAddress.city}, {order.shippingAddress.state}
              </span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="order-items">
          <h3>Items Ordered</h3>
          {order.items.map((item, index) => (
            <div key={index} className="order-item">
              {item.image && (
                <img src={item.image} alt={item.name} />
              )}
              <div className="order-item-info">
                <h4>{item.name}</h4>
                <p>Qty: {item.quantity}</p>
              </div>
              <p className="order-item-price">${(item.price * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="order-total">
            <span>Total Paid</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Trust row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
          marginBottom: 28, fontSize: '0.8rem', color: '#636E72'
        }}>
          <span>🚚 Ships within 2-3 business days</span>
          <span>🔄 30-Day returns</span>
          <span>📧 Confirmation email sent</span>
        </div>

        <Link to="/" className="continue-shopping-btn">
          ← Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;