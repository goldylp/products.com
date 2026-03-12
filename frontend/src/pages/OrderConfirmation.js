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
      .then(data => {
        setOrder(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [orderId]);

  if (loading) return <div className="loading">Loading order details...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  const orderDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="confirmation-page">
      <div className="confirmation-container">
        <div className="success-icon">✓</div>
        <h1>Order Confirmed!</h1>
        <p className="order-message">Thank you for your purchase. Your order has been placed successfully.</p>

        <div className="order-details">
          <div className="detail-row">
            <span className="detail-label">Order ID</span>
            <span className="detail-value">{order._id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Date</span>
            <span className="detail-value">{orderDate}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Payment ID</span>
            <span className="detail-value">{order.stripePaymentId}</span>
          </div>
        </div>

        <div className="order-items">
          <h3>Order Items</h3>
          {order.items.map((item, index) => (
            <div key={index} className="order-item">
              <img src={item.image} alt={item.name} />
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

        <Link to="/" className="continue-shopping-btn">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};

export default OrderConfirmation;