import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../utils/api';

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const OrderDetails = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, getAuthHeader } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    setLoading(true);
    setError('');

    fetch(getApiUrl(`/api/my-orders/${orderId}`), {
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      }
    })
      .then((res) => res.ok ? res.json() : Promise.reject('Order not found'))
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(typeof err === 'string' ? err : 'Failed to load order');
        setLoading(false);
      });
  }, [authLoading, getAuthHeader, navigate, orderId, user]);

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        <span>Loading order details...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const subtotal = Number(order.total || 0) - Number(order.shippingCost || 0);

  return (
    <div className="store-order-page">
      <div className="store-order-container">
        <div className="store-order-header">
          <div>
            <h1>Order Details</h1>
            <p>Review your order summary, shipping details, and purchased items.</p>
          </div>
          <Link to="/my-orders" className="store-order-back">
            Back to My Orders
          </Link>
        </div>

        <div className="store-order-grid">
          <div className="store-order-card">
            <h2>Order Summary</h2>
            <div className="store-order-list">
              <div><span>Order ID</span><strong>#{String(order._id).slice(-8).toUpperCase()}</strong></div>
              <div><span>Order Number</span><strong>{order.orderNumber || `HF-${String(order._id).slice(-8).toUpperCase()}`}</strong></div>
              <div><span>Status</span><strong>{order.status || 'processing'}</strong></div>
              <div><span>Created</span><strong>{new Date(order.createdAt).toLocaleString()}</strong></div>
              <div><span>Shipping</span><strong>{formatMoney(order.shippingCost)}</strong></div>
              <div><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
              <div><span>Shipping Service</span><strong>{order.shippingMethod || 'N/A'}</strong></div>
            </div>
          </div>

          <div className="store-order-card">
            <h2>Customer</h2>
            <div className="store-order-list">
              <div><span>Email</span><strong>{order.customerEmail || 'N/A'}</strong></div>
              <div><span>Phone</span><strong>{order.customerPhone || 'N/A'}</strong></div>
              <div><span>Payment ID</span><strong>{order.stripePaymentId || 'N/A'}</strong></div>
            </div>
          </div>

          <div className="store-order-card">
            <h2>Shipping Address</h2>
            <div className="store-order-address">
              <p>{order.shippingAddress?.fullName || 'N/A'}</p>
              <p>{order.shippingAddress?.addressLine1 || 'N/A'}</p>
              {order.shippingAddress?.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{[order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
              <p>{order.shippingAddress?.country || 'N/A'}</p>
            </div>
          </div>

          <div className="store-order-card">
            <h2>Billing Address</h2>
            <div className="store-order-address">
              <p>{order.billingAddress?.fullName || 'N/A'}</p>
              <p>{order.billingAddress?.addressLine1 || 'N/A'}</p>
              {order.billingAddress?.addressLine2 && <p>{order.billingAddress.addressLine2}</p>}
              <p>{[order.billingAddress?.city, order.billingAddress?.state, order.billingAddress?.zipCode].filter(Boolean).join(', ') || 'N/A'}</p>
              <p>{order.billingAddress?.country || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="store-order-card store-order-items-card">
          <h2>Items</h2>
          <div className="store-order-items">
            {(order.items || []).map((item, index) => (
              <div key={`${item.productId || item.name}-${index}`} className="store-order-item">
                <div className="store-order-item-main">
                  <strong>{item.name}</strong>
                  <span>Qty: {item.quantity}</span>
                </div>
                <strong>{formatMoney(Number(item.price) * Number(item.quantity || 1))}</strong>
              </div>
            ))}
          </div>
          <div className="store-order-breakdown">
            <div><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
            <div><span>Shipping</span><strong>{formatMoney(order.shippingCost)}</strong></div>
            <div className="store-order-breakdown-total"><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
