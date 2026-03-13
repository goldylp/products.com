import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MyOrders = () => {
  const { user, getAuthHeader } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetch('http://localhost:5000/api/my-orders', {
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    })
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch orders'))
      .then(data => setOrders(data))
      .catch(err => setError(typeof err === 'string' ? err : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="loading">Loading your orders...</div>;
  if (error)   return <div className="error">{error}</div>;

  return (
    <div className="my-orders-page">
      <div className="my-orders-container">
        <div className="my-orders-header">
          <h1>My Orders</h1>
          <p className="orders-subtitle">
            Logged in as <strong>{user?.email}</strong> — {orders.length} order{orders.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="no-orders">
            <div className="no-orders-icon">📦</div>
            <h2>No orders yet</h2>
            <p>You haven't placed any orders. Start shopping!</p>
            <Link to="/" className="start-shopping-btn">Browse Products</Link>
          </div>
        ) : (
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Shipped To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order._id}>
                    <td className="order-id-cell">
                      <span className="order-id">#{order._id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td>
                      <div className="order-items-preview">
                        {order.items.slice(0, 2).map((item, i) => (
                          <span key={i} className="item-tag">
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                        {order.items.length > 2 && (
                          <span className="item-tag more">+{order.items.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="order-total-cell">
                      <strong>${order.total.toFixed(2)}</strong>
                    </td>
                    <td className="shipping-cell">
                      {order.shippingAddress
                        ? `${order.shippingAddress.city}, ${order.shippingAddress.country}`
                        : '—'}
                    </td>
                    <td>
                      <Link to={`/order-confirmation/${order._id}`} className="view-order-btn">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrders;