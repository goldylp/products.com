import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import './Checkout.css';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T9n5MHXAZgOY02NKj4S3c7gZ5RB5JpXI8Rnl9ZKc8rJDHzEs6Oc4PfMUYaXggdqxFZ5Xx9HqlANo2Q0WcpMw78N00IgJ9eUI8';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone) => {
  return /^[\d\s\-+()]{7,20}$/.test(phone);
};

const validateZipCode = (zip) => {
  return /^[\d\s\-]{3,10}$/.test(zip);
};

const CheckoutForm = ({ total }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPhone: '',
    sameAsBilling: true,
    shippingAddress: {
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    },
    billingAddress: {
      fullName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'United States'
    }
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e, field, isNested = false) => {
    const { name, value } = e.target;

    if (isNested) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    if (errors[name] || (isNested && errors[field]?.[name])) {
      setErrors(prev => {
        if (isNested) {
          return {
            ...prev,
            [field]: {
              ...(prev[field] || {}),
              [name]: null
            }
          };
        }
        return { ...prev, [name]: null };
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email or phone required
    if (!formData.customerEmail && !formData.customerPhone) {
      newErrors.customerEmail = 'Email or phone is required';
      newErrors.customerPhone = 'Email or phone is required';
    } else if (formData.customerEmail && !validateEmail(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    } else if (formData.customerPhone && !validatePhone(formData.customerPhone)) {
      newErrors.customerPhone = 'Invalid phone format';
    }

    // Shipping address validation
    if (!formData.shippingAddress.fullName || formData.shippingAddress.fullName.trim().length < 2) {
      newErrors.shippingFullName = 'Full name is required';
    }
    if (!formData.shippingAddress.addressLine1 || formData.shippingAddress.addressLine1.trim().length < 5) {
      newErrors.shippingAddressLine1 = 'Valid address is required';
    }
    if (!formData.shippingAddress.city || formData.shippingAddress.city.trim().length < 2) {
      newErrors.shippingCity = 'City is required';
    }
    if (!formData.shippingAddress.state || formData.shippingAddress.state.trim().length < 2) {
      newErrors.shippingState = 'State is required';
    }
    if (!formData.shippingAddress.zipCode || !validateZipCode(formData.shippingAddress.zipCode)) {
      newErrors.shippingZipCode = 'Valid ZIP code is required';
    }
    if (!formData.shippingAddress.country || formData.shippingAddress.country.trim().length < 2) {
      newErrors.shippingCountry = 'Country is required';
    }

    // Billing address validation (if different from shipping)
    if (!formData.sameAsBilling) {
      if (!formData.billingAddress.fullName || formData.billingAddress.fullName.trim().length < 2) {
        newErrors.billingFullName = 'Full name is required';
      }
      if (!formData.billingAddress.addressLine1 || formData.billingAddress.addressLine1.trim().length < 5) {
        newErrors.billingAddressLine1 = 'Valid address is required';
      }
      if (!formData.billingAddress.city || formData.billingAddress.city.trim().length < 2) {
        newErrors.billingCity = 'City is required';
      }
      if (!formData.billingAddress.state || formData.billingAddress.state.trim().length < 2) {
        newErrors.billingState = 'State is required';
      }
      if (!formData.billingAddress.zipCode || !validateZipCode(formData.billingAddress.zipCode)) {
        newErrors.billingZipCode = 'Valid ZIP code is required';
      }
      if (!formData.billingAddress.country || formData.billingAddress.country.trim().length < 2) {
        newErrors.billingCountry = 'Country is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    // Validate form before processing
    if (!validateForm()) {
      setError('Please fix the form errors before submitting');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const intentResponse = await fetch('http://localhost:5000/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      });

      if (!intentResponse.ok) {
        const errData = await intentResponse.json();
        throw new Error(errData.error || 'Failed to create payment');
      }

      const { clientSecret } = await intentResponse.json();

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      const { paymentIntent, error: stripeError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement
        }
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // Prepare billing address
        const billingAddress = formData.sameAsBilling
          ? formData.shippingAddress
          : formData.billingAddress;

        // Create order in database
        const orderResponse = await fetch('http://localhost:5000/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map(item => ({
              productId: item._id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image
            })),
            total: total,
            stripePaymentId: paymentIntent.id,
            customerEmail: formData.customerEmail || null,
            customerPhone: formData.customerPhone || null,
            shippingAddress: formData.shippingAddress,
            billingAddress: formData.sameAsBilling ? null : billingAddress,
            sameAsBilling: formData.sameAsBilling
          })
        });

        if (!orderResponse.ok) {
          const errData = await orderResponse.json();
          throw new Error(errData.error || 'Failed to create order');
        }

        const order = await orderResponse.json();
        clearCart();
        navigate(`/order-confirmation/${order._id}`);
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-section">
        <h3>Contact Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange(e)}
              placeholder="your@email.com"
              className={errors.customerEmail ? 'error' : ''}
            />
            {errors.customerEmail && <span className="error-text">{errors.customerEmail}</span>}
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={(e) => handleInputChange(e)}
              placeholder="(555) 123-4567"
              className={errors.customerPhone ? 'error' : ''}
            />
            {errors.customerPhone && <span className="error-text">{errors.customerPhone}</span>}
          </div>
        </div>
        <p className="field-hint">Enter email or phone (at least one required)</p>
      </div>

      <div className="form-section">
        <h3>Shipping Address</h3>
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            name="fullName"
            value={formData.shippingAddress.fullName}
            onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
            placeholder="John Doe"
            className={errors.shippingFullName ? 'error' : ''}
          />
          {errors.shippingFullName && <span className="error-text">{errors.shippingFullName}</span>}
        </div>
        <div className="form-group">
          <label>Address Line 1 *</label>
          <input
            type="text"
            name="addressLine1"
            value={formData.shippingAddress.addressLine1}
            onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
            placeholder="123 Main Street"
            className={errors.shippingAddressLine1 ? 'error' : ''}
          />
          {errors.shippingAddressLine1 && <span className="error-text">{errors.shippingAddressLine1}</span>}
        </div>
        <div className="form-group">
          <label>Address Line 2 (Optional)</label>
          <input
            type="text"
            name="addressLine2"
            value={formData.shippingAddress.addressLine2}
            onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
            placeholder="Apt, Suite, etc."
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>City *</label>
            <input
              type="text"
              name="city"
              value={formData.shippingAddress.city}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="New York"
              className={errors.shippingCity ? 'error' : ''}
            />
            {errors.shippingCity && <span className="error-text">{errors.shippingCity}</span>}
          </div>
          <div className="form-group">
            <label>State *</label>
            <input
              type="text"
              name="state"
              value={formData.shippingAddress.state}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="NY"
              className={errors.shippingState ? 'error' : ''}
            />
            {errors.shippingState && <span className="error-text">{errors.shippingState}</span>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>ZIP Code *</label>
            <input
              type="text"
              name="zipCode"
              value={formData.shippingAddress.zipCode}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="10001"
              className={errors.shippingZipCode ? 'error' : ''}
            />
            {errors.shippingZipCode && <span className="error-text">{errors.shippingZipCode}</span>}
          </div>
          <div className="form-group">
            <label>Country *</label>
            <input
              type="text"
              name="country"
              value={formData.shippingAddress.country}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="United States"
              className={errors.shippingCountry ? 'error' : ''}
            />
            {errors.shippingCountry && <span className="error-text">{errors.shippingCountry}</span>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Billing Address</h3>
        <div className="checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="sameAsBilling"
              checked={formData.sameAsBilling}
              onChange={(e) => setFormData(prev => ({ ...prev, sameAsBilling: e.target.checked }))}
            />
            <span>Same as shipping address</span>
          </label>
        </div>

        {!formData.sameAsBilling && (
          <div className="billing-fields">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="fullName"
                value={formData.billingAddress.fullName}
                onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                placeholder="John Doe"
                className={errors.billingFullName ? 'error' : ''}
              />
              {errors.billingFullName && <span className="error-text">{errors.billingFullName}</span>}
            </div>
            <div className="form-group">
              <label>Address Line 1 *</label>
              <input
                type="text"
                name="addressLine1"
                value={formData.billingAddress.addressLine1}
                onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                placeholder="123 Main Street"
                className={errors.billingAddressLine1 ? 'error' : ''}
              />
              {errors.billingAddressLine1 && <span className="error-text">{errors.billingAddressLine1}</span>}
            </div>
            <div className="form-group">
              <label>Address Line 2 (Optional)</label>
              <input
                type="text"
                name="addressLine2"
                value={formData.billingAddress.addressLine2}
                onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                placeholder="Apt, Suite, etc."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.billingAddress.city}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="New York"
                  className={errors.billingCity ? 'error' : ''}
                />
                {errors.billingCity && <span className="error-text">{errors.billingCity}</span>}
              </div>
              <div className="form-group">
                <label>State *</label>
                <input
                  type="text"
                  name="state"
                  value={formData.billingAddress.state}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="NY"
                  className={errors.billingState ? 'error' : ''}
                />
                {errors.billingState && <span className="error-text">{errors.billingState}</span>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>ZIP Code *</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.billingAddress.zipCode}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="10001"
                  className={errors.billingZipCode ? 'error' : ''}
                />
                {errors.billingZipCode && <span className="error-text">{errors.billingZipCode}</span>}
              </div>
              <div className="form-group">
                <label>Country *</label>
                <input
                  type="text"
                  name="country"
                  value={formData.billingAddress.country}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="United States"
                  className={errors.billingCountry ? 'error' : ''}
                />
                {errors.billingCountry && <span className="error-text">{errors.billingCountry}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Payment</h3>
        <div className="card-element-container">
          <label>Card Details</label>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#2D3436',
                  '::placeholder': { color: '#636E72' }
                },
                invalid: { color: '#FF6B6B' }
              }
            }}
          />
        </div>
      </div>

      {error && <div className="payment-error">{error}</div>}
      <button type="submit" disabled={!stripe || loading} className="pay-button">
        {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
};

const Checkout = () => {
  const { cartItems, cartTotal } = useCart();
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>
        <div className="checkout-content">
          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item._id} className="summary-item">
                  <img src={item.image} alt={item.name} />
                  <div className="summary-item-info">
                    <h4>{item.name}</h4>
                    <p>Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                  </div>
                  <p className="summary-item-total">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="payment-section">
            <Elements stripe={stripePromise}>
              <CheckoutForm total={cartTotal} />
            </Elements>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;