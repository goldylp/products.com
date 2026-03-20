import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApiUrl } from '../utils/api';

const normalizeOrderNumber = (value = '') => value.trim().toUpperCase().replace(/^#/, '');

const getTrackingMeta = (status = '') => {
  const normalized = String(status).trim().toLowerCase().replace(/[_-]+/g, ' ');

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return {
      stage: -1,
      theme: 'cancelled',
      badge: 'Cancelled',
      title: 'This order has been cancelled',
      message: 'The order is no longer in progress. Contact support if you need help with a replacement or refund.'
    };
  }

  if (normalized === 'delivered') {
    return {
      stage: 3,
      theme: 'delivered',
      badge: 'Delivered',
      title: 'Your order has been delivered',
      message: 'The package has reached its destination. We hope everything arrived exactly as expected.'
    };
  }

  if (normalized === 'out for delivery') {
    return {
      stage: 2,
      theme: 'out',
      badge: 'Out for Delivery',
      title: 'Your order is out for delivery',
      message: 'The package is with the delivery carrier and should arrive very soon.'
    };
  }

  if (normalized === 'shipping' || normalized === 'shipped' || normalized === 'in transit') {
    return {
      stage: 1,
      theme: 'shipping',
      badge: 'Shipping',
      title: 'Your order is on the way',
      message: 'Your package has left our facility and is moving through the shipping network.'
    };
  }

  return {
    stage: 0,
    theme: 'processing',
    badge: 'Processing',
    title: 'Your order is being prepared',
    message: 'We have received your order and the team is preparing it for shipment.'
  };
};

const TRACKING_STEPS = ['Processing', 'Shipping', 'Out for Delivery', 'Delivered'];

const formatMoney = (amount) => `$${Number(amount || 0).toFixed(2)}`;

const TrackOrder = () => {
  const { orderNumber: routeOrderNumber } = useParams();
  const navigate = useNavigate();
  const [orderNumberInput, setOrderNumberInput] = useState(routeOrderNumber || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputError, setInputError] = useState('');

  const trackingMeta = useMemo(() => getTrackingMeta(order?.status), [order]);

  useEffect(() => {
    setOrderNumberInput(routeOrderNumber || '');
  }, [routeOrderNumber]);

  useEffect(() => {
    if (!routeOrderNumber) {
      setOrder(null);
      setError('');
      setLoading(false);
      return;
    }

    const normalized = normalizeOrderNumber(routeOrderNumber);
    if (!normalized) {
      return;
    }

    setLoading(true);
    setError('');

    fetch(getApiUrl(`/api/track-order/${encodeURIComponent(normalized)}`))
      .then((res) => res.ok ? res.json() : res.json().then((data) => Promise.reject(data.error || 'Order not found')))
      .then((data) => {
        setOrder(data);
        setLoading(false);
      })
      .catch((err) => {
        setOrder(null);
        setError(typeof err === 'string' ? err : 'We could not find an order with that number.');
        setLoading(false);
      });
  }, [routeOrderNumber]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalized = normalizeOrderNumber(orderNumberInput);

    if (!normalized) {
      setInputError('Please enter your order number.');
      return;
    }

    setInputError('');
    navigate(`/track-order/${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="track-order-page">
      <div className="track-order-container">
        <section className="track-order-hero">
          <div className="track-order-copy">
            <span className="track-order-eyebrow">Track Your Order</span>
            <h1>Follow your order in real time</h1>
            <p>
              Enter the order number from your confirmation email to see whether your package is
              being prepared, shipped, or already out for delivery.
            </p>
          </div>

          <form className="track-order-form-card" onSubmit={handleSubmit} noValidate>
            <label htmlFor="track-order-number">Order Number</label>
            <div className="track-order-form-row">
              <input
                id="track-order-number"
                type="text"
                value={orderNumberInput}
                onChange={(event) => {
                  setOrderNumberInput(event.target.value);
                  if (inputError) setInputError('');
                }}
                placeholder="Example: HF-65F4B1A2"
                autoComplete="off"
              />
              <button type="submit" className="track-order-btn">Track Order</button>
            </div>
            {inputError && <p className="track-order-field-error">{inputError}</p>}
            <p className="track-order-helper">
              You can also enter the short order code shown in your account or confirmation email.
            </p>
          </form>
        </section>

        {loading && (
          <div className="track-order-state-card">
            <div className="loading">
              <div className="loading-spinner" />
              <span>Checking your latest order status...</span>
            </div>
          </div>
        )}

        {!loading && error && routeOrderNumber && (
          <div className="track-order-state-card track-order-error-card">
            <h2>Order not found</h2>
            <p>{error}</p>
            <Link to="/contact" className="track-order-secondary-link">Need help? Contact support</Link>
          </div>
        )}

        {!loading && order && (
          <section className="track-order-results">
            <div className={`track-order-status-card theme-${trackingMeta.theme}`}>
              <div className="track-order-status-top">
                <div>
                  <p className="track-order-label">Order Number</p>
                  <h2>{order.orderNumber}</h2>
                </div>
                <span className={`track-order-badge badge-${trackingMeta.theme}`}>{trackingMeta.badge}</span>
              </div>

              <div className="track-order-hero-status">
                <div className="track-order-orb">
                  <span className="track-order-orb-core" />
                </div>
                <div>
                  <h3>{trackingMeta.title}</h3>
                  <p>{trackingMeta.message}</p>
                </div>
              </div>

              {trackingMeta.stage >= 0 ? (
                <div className="track-order-timeline">
                  {TRACKING_STEPS.map((step, index) => {
                    const isComplete = trackingMeta.stage > index;
                    const isCurrent = trackingMeta.stage === index;
                    return (
                      <div
                        key={step}
                        className={`track-order-step${isComplete ? ' complete' : ''}${isCurrent ? ' current' : ''}`}
                      >
                        <div className="track-order-step-dot">{index + 1}</div>
                        <div className="track-order-step-text">
                          <strong>{step}</strong>
                          <span>{isCurrent ? 'Current stage' : isComplete ? 'Completed' : 'Pending'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="track-order-cancelled-note">
                  Tracking has stopped for this order because it was cancelled.
                </div>
              )}
            </div>

            <div className="track-order-grid">
              <div className="track-order-info-card">
                <h3>Shipment Snapshot</h3>
                <div className="track-order-info-list">
                  <div><span>Placed On</span><strong>{new Date(order.createdAt).toLocaleString()}</strong></div>
                  <div><span>Items</span><strong>{order.itemCount}</strong></div>
                  <div><span>Shipping Service</span><strong>{order.shippingMethod || 'Standard'}</strong></div>
                  <div><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
                </div>
              </div>

              <div className="track-order-info-card">
                <h3>Destination</h3>
                <div className="track-order-info-list">
                  <div><span>City</span><strong>{order.destination?.city || 'N/A'}</strong></div>
                  <div><span>State</span><strong>{order.destination?.state || 'N/A'}</strong></div>
                  <div><span>Country</span><strong>{order.destination?.country || 'N/A'}</strong></div>
                  <div><span>Shipping Cost</span><strong>{formatMoney(order.shippingCost)}</strong></div>
                </div>
              </div>
            </div>

            <div className="track-order-info-card track-order-items-card">
              <h3>Order Items</h3>
              <div className="track-order-items">
                {(order.items || []).map((item, index) => (
                  <div className="track-order-item" key={`${item.name}-${index}`}>
                    <div className="track-order-item-main">
                      {item.image ? <img src={item.image} alt={item.name} className="track-order-item-image" /> : <div className="track-order-item-placeholder">{item.name?.charAt(0) || 'P'}</div>}
                      <div>
                        <strong>{item.name}</strong>
                        <span>Quantity: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default TrackOrder;
