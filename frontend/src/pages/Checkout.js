import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import './Checkout.css';

const STRIPE_PUBLISHABLE_KEY = 'pk_test_51T9n5MHXAZgOY02NKj4S3c7gZ5RB5JpXI8Rnl9ZKc8rJDHzEs6Oc4PfMUYaXggdqxFZ5Xx9HqlANo2Q0WcpMw78N00IgJ9eUI8';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Countries and their states
const COUNTRIES_STATES = {
  'United States': {
    states: ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming']
  },
  'Canada': {
    states: ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon']
  },
  'United Kingdom': {
    states: ['England', 'Northern Ireland', 'Scotland', 'Wales']
  },
  'Australia': {
    states: ['Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia']
  },
  'Germany': {
    states: ['Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia']
  },
  'France': {
    states: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur']
  },
  'India': {
    states: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi']
  }
};

const COUNTRIES = Object.keys(COUNTRIES_STATES);

const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return false;
  return /^[\d\s\-+()]{7,20}$/.test(phone);
};

const validateZipCode = (zip) => {
  if (!zip) return false;
  return /^[\d\s\-]{3,10}$/.test(zip);
};

const validateRequired = (value) => {
  return value && value.trim().length > 0;
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
      firstName: '',
      lastName: '',
      addressLine1: '',
      addressLine2: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    },
    billingAddress: {
      firstName: '',
      lastName: '',
      addressLine1: '',
      addressLine2: '',
      country: '',
      state: '',
      city: '',
      zipCode: ''
    }
  });

  const [errors, setErrors] = useState({});

  // Get states for selected country
  const getStatesForCountry = (country) => {
    return COUNTRIES_STATES[country]?.states || [];
  };

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

      // Reset state when country changes
      if (name === 'country') {
        setFormData(prev => ({
          ...prev,
          [field]: {
            ...prev[field],
            [name]: value,
            state: ''
          }
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Clear error when user starts typing
    const errorKey = isNested ? `${field}${name.charAt(0).toUpperCase() + name.slice(1)}` : name;
    if (errors[errorKey]) {
      setErrors(prev => ({ ...prev, [errorKey]: null }));
    }
  };

  const handleSelectChange = (e, field, isNested = false) => {
    const { name, value } = e.target;
    handleInputChange({ target: { name, value } }, field, isNested);
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.customerEmail) {
      newErrors.customerEmail = 'Email is required';
    } else if (!validateEmail(formData.customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }

    // Phone validation
    if (!formData.customerPhone) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!validatePhone(formData.customerPhone)) {
      newErrors.customerPhone = 'Invalid phone format';
    }

    // Shipping address validation
    if (!validateRequired(formData.shippingAddress.firstName)) {
      newErrors.shippingFirstName = 'First name is required';
    }
    if (!validateRequired(formData.shippingAddress.lastName)) {
      newErrors.shippingLastName = 'Last name is required';
    }
    if (!formData.shippingAddress.addressLine1 || formData.shippingAddress.addressLine1.trim().length < 5) {
      newErrors.shippingAddressLine1 = 'Valid address is required';
    }
    if (!formData.shippingAddress.country) {
      newErrors.shippingCountry = 'Country is required';
    }
    if (!formData.shippingAddress.state) {
      newErrors.shippingState = 'State is required';
    }
    if (!validateRequired(formData.shippingAddress.city)) {
      newErrors.shippingCity = 'City is required';
    }
    if (!validateZipCode(formData.shippingAddress.zipCode)) {
      newErrors.shippingZipCode = 'Valid ZIP code is required';
    }

    // Billing address validation (if different from shipping)
    if (!formData.sameAsBilling) {
      if (!validateRequired(formData.billingAddress.firstName)) {
        newErrors.billingFirstName = 'First name is required';
      }
      if (!validateRequired(formData.billingAddress.lastName)) {
        newErrors.billingLastName = 'Last name is required';
      }
      if (!formData.billingAddress.addressLine1 || formData.billingAddress.addressLine1.trim().length < 5) {
        newErrors.billingAddressLine1 = 'Valid address is required';
      }
      if (!formData.billingAddress.country) {
        newErrors.billingCountry = 'Country is required';
      }
      if (!formData.billingAddress.state) {
        newErrors.billingState = 'State is required';
      }
      if (!validateRequired(formData.billingAddress.city)) {
        newErrors.billingCity = 'City is required';
      }
      if (!validateZipCode(formData.billingAddress.zipCode)) {
        newErrors.billingZipCode = 'Valid ZIP code is required';
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

      // Get card elements
      const cardNumberElement = elements.getElement(CardNumberElement);

      // Create payment method
      const { paymentMethod, error: stripeError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardNumberElement,
        billing_details: {
          name: `${formData.shippingAddress.firstName} ${formData.shippingAddress.lastName}`,
          email: formData.customerEmail || undefined,
          phone: formData.customerPhone || undefined,
          address: {
            line1: formData.shippingAddress.addressLine1,
            line2: formData.shippingAddress.addressLine2 || undefined,
            city: formData.shippingAddress.city,
            state: formData.shippingAddress.state,
            postal_code: formData.shippingAddress.zipCode,
            country: getCountryCode(formData.shippingAddress.country)
          }
        }
      });

      if (stripeError) {
        setError(stripeError.message);
        setLoading(false);
        return;
      }

      // Confirm payment
      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id
      });

      if (confirmError) {
        setError(confirmError.message);
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
            shippingAddress: {
              fullName: `${formData.shippingAddress.firstName} ${formData.shippingAddress.lastName}`,
              addressLine1: formData.shippingAddress.addressLine1,
              addressLine2: formData.shippingAddress.addressLine2 || '',
              city: formData.shippingAddress.city,
              state: formData.shippingAddress.state,
              zipCode: formData.shippingAddress.zipCode,
              country: formData.shippingAddress.country
            },
            billingAddress: formData.sameAsBilling ? null : {
              fullName: `${formData.billingAddress.firstName} ${formData.billingAddress.lastName}`,
              addressLine1: formData.billingAddress.addressLine1,
              addressLine2: formData.billingAddress.addressLine2 || '',
              city: formData.billingAddress.city,
              state: formData.billingAddress.state,
              zipCode: formData.billingAddress.zipCode,
              country: formData.billingAddress.country
            },
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

  // Helper to convert country name to code
  const getCountryCode = (countryName) => {
    const codes = {
      'United States': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'Australia': 'AU',
      'Germany': 'DE',
      'France': 'FR',
      'India': 'IN'
    };
    return codes[countryName] || countryName;
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#2D3436',
        '::placeholder': { color: '#636E72' }
      },
      invalid: { color: '#FF6B6B' }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="form-section">
        <h3>Contact Information</h3>
        <div className="form-group">
          <label>Email Address *</label>
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
      </div>

      <div className="form-section">
        <h3>Shipping Address</h3>
        <div className="form-row">
          <div className="form-group">
            <label>First Name *</label>
            <input
              type="text"
              name="firstName"
              value={formData.shippingAddress.firstName}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="John"
              className={errors.shippingFirstName ? 'error' : ''}
            />
            {errors.shippingFirstName && <span className="error-text">{errors.shippingFirstName}</span>}
          </div>
          <div className="form-group">
            <label>Last Name *</label>
            <input
              type="text"
              name="lastName"
              value={formData.shippingAddress.lastName}
              onChange={(e) => handleInputChange(e, 'shippingAddress', true)}
              placeholder="Doe"
              className={errors.shippingLastName ? 'error' : ''}
            />
            {errors.shippingLastName && <span className="error-text">{errors.shippingLastName}</span>}
          </div>
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
            <label>Country *</label>
            <select
              name="country"
              value={formData.shippingAddress.country}
              onChange={(e) => handleSelectChange(e, 'shippingAddress', true)}
              className={errors.shippingCountry ? 'error' : ''}
            >
              <option value="">Select Country</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            {errors.shippingCountry && <span className="error-text">{errors.shippingCountry}</span>}
          </div>
          <div className="form-group">
            <label>State/Province *</label>
            <select
              name="state"
              value={formData.shippingAddress.state}
              onChange={(e) => handleSelectChange(e, 'shippingAddress', true)}
              className={errors.shippingState ? 'error' : ''}
              disabled={!formData.shippingAddress.country}
            >
              <option value="">Select State</option>
              {getStatesForCountry(formData.shippingAddress.country).map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            {errors.shippingState && <span className="error-text">{errors.shippingState}</span>}
          </div>
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
            <label>ZIP/Postal Code *</label>
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
        </div>
        <div className="form-group">
          <label>Phone Number *</label>
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
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.billingAddress.firstName}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="John"
                  className={errors.billingFirstName ? 'error' : ''}
                />
                {errors.billingFirstName && <span className="error-text">{errors.billingFirstName}</span>}
              </div>
              <div className="form-group">
                <label>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.billingAddress.lastName}
                  onChange={(e) => handleInputChange(e, 'billingAddress', true)}
                  placeholder="Doe"
                  className={errors.billingLastName ? 'error' : ''}
                />
                {errors.billingLastName && <span className="error-text">{errors.billingLastName}</span>}
              </div>
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
                <label>Country *</label>
                <select
                  name="country"
                  value={formData.billingAddress.country}
                  onChange={(e) => handleSelectChange(e, 'billingAddress', true)}
                  className={errors.billingCountry ? 'error' : ''}
                >
                  <option value="">Select Country</option>
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
                {errors.billingCountry && <span className="error-text">{errors.billingCountry}</span>}
              </div>
              <div className="form-group">
                <label>State/Province *</label>
                <select
                  name="state"
                  value={formData.billingAddress.state}
                  onChange={(e) => handleSelectChange(e, 'billingAddress', true)}
                  className={errors.billingState ? 'error' : ''}
                  disabled={!formData.billingAddress.country}
                >
                  <option value="">Select State</option>
                  {getStatesForCountry(formData.billingAddress.country).map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
                {errors.billingState && <span className="error-text">{errors.billingState}</span>}
              </div>
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
                <label>ZIP/Postal Code *</label>
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
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <h3>Payment Details</h3>
        <div className="card-fields">
          <div className="form-group">
            <label>Card Number</label>
            <CardNumberElement
              options={{
                ...cardElementOptions,
                placeholder: '1234 5678 9012 3456'
              }}
              className="card-input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Expiry Date</label>
              <CardExpiryElement
                options={cardElementOptions}
                className="card-input"
              />
            </div>
            <div className="form-group">
              <label>CVV/CVC</label>
              <CardCvcElement
                options={{
                  ...cardElementOptions,
                  placeholder: '123'
                }}
                className="card-input"
              />
            </div>
          </div>
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
          <div className="payment-section">
            <Elements stripe={stripePromise}>
              <CheckoutForm total={cartTotal} />
            </Elements>
          </div>
          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {cartItems.map(item => (
                <div key={item._id} className="summary-item">
                  <img src={item.image} alt={item.name} />
                  <div className="summary-item-info">
                    <h4>{item.name}</h4>
                    <p>Qty: {item.quantity} x ${item.price.toFixed(2)}</p>
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
        </div>
      </div>
    </div>
  );
};

export default Checkout;