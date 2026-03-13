import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  useStripe,
  useElements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement
} from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const stripePromise = loadStripe('pk_test_51T9n5MHXAZgOY02NKj4S3c7gZ5RB5JpXI8Rnl9ZKc8rJDHzEs6Oc4PfMUYaXggdqxFZ5Xx9HqlANo2Q0WcpMw78N00IgJ9eUI8');

const COUNTRIES_STATES = {
  'United States': {
    states: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
      'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas',
      'Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota',
      'Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey',
      'New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon',
      'Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas',
      'Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming']
  },
  'Canada': {
    states: ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador',
      'Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island',
      'Quebec','Saskatchewan','Yukon']
  },
  'United Kingdom': { states: ['England','Scotland','Wales','Northern Ireland'] },
  'Australia': {
    states: ['Australian Capital Territory','New South Wales','Northern Territory',
      'Queensland','South Australia','Tasmania','Victoria','Western Australia']
  },
  'Germany': { states: ['Baden-Württemberg','Bavaria','Berlin','Brandenburg','Bremen','Hamburg',
    'Hesse','Lower Saxony','Mecklenburg-Vorpommern','North Rhine-Westphalia','Rhineland-Palatinate',
    'Saarland','Saxony','Saxony-Anhalt','Schleswig-Holstein','Thuringia'] },
  'France': { states: ['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Bretagne',
    'Centre-Val de Loire','Corse','Grand Est','Hauts-de-France','Île-de-France',
    'Normandie','Nouvelle-Aquitaine','Occitanie','Pays de la Loire',"Provence-Alpes-Côte d'Azur"] },
  'India': {
    states: ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
      'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
      'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan',
      'Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
      'Delhi','Jammu and Kashmir','Ladakh','Puducherry']
  }
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone) => !phone || /^[\d\s\-+()]{7,20}$/.test(phone);
const validateZipCode = (zip) => zip && /^[\d\s\-]{3,10}$/.test(zip);
const validateRequired = (value) => value && value.trim().length > 0;

const getCountryCode = (countryName) => {
  const codes = {
    'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB',
    'Australia': 'AU', 'Germany': 'DE', 'France': 'FR', 'India': 'IN'
  };
  return codes[countryName] || countryName;
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1B1F3B',
      fontFamily: "'Poppins', sans-serif",
      '::placeholder': { color: '#A0A8B8' }
    },
    invalid: { color: '#FF6B6B' }
  }
};

// ── Order Summary Panel ────────────────────────────────────────────────────────
const OrderSummaryPanel = ({ cartItems, cartTotal }) => {
  const shippingFree = cartTotal >= 50;

  return (
    <div className="order-summary-panel">
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
      <div className="summary-totals">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${cartTotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Shipping</span>
          <span className={shippingFree ? 'free' : ''}>
            {shippingFree ? 'FREE 🎉' : '$5.99'}
          </span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span className="price">${cartTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// ── Checkout Form ─
const CheckoutForm = ({ total }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();
  const { getAuthHeader } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerEmail: '',
    customerPhone: '',
    sameAsBilling: true,
    shippingAddress: {
      firstName: '', lastName: '', addressLine1: '',
      addressLine2: '', country: '', state: '', city: '', zipCode: ''
    },
    billingAddress: {
      firstName: '', lastName: '', addressLine1: '',
      addressLine2: '', country: '', state: '', city: '', zipCode: ''
    }
  });

  const [errors, setErrors] = useState({});

  const getStatesForCountry = (country) => COUNTRIES_STATES[country]?.states || [];

  const handleInputChange = (e, field, isNested = false) => {
    const { name, value } = e.target;
    if (isNested) {
      setFormData(prev => ({
        ...prev,
        [field]: { ...prev[field], [name]: value, ...(name === 'country' ? { state: '' } : {}) }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    const errorKey = isNested
      ? `${field === 'shippingAddress' ? 'shipping' : 'billing'}${name.charAt(0).toUpperCase() + name.slice(1)}`
      : name;
    if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!validateEmail(formData.customerEmail)) newErrors.customerEmail = 'Valid email is required';
    if (!validatePhone(formData.customerPhone)) newErrors.customerPhone = 'Invalid phone format';
    if (!validateRequired(formData.shippingAddress.firstName)) newErrors.shippingFirstName = 'Required';
    if (!validateRequired(formData.shippingAddress.lastName)) newErrors.shippingLastName = 'Required';
    if (!formData.shippingAddress.addressLine1?.trim()) newErrors.shippingAddressLine1 = 'Required';
    if (!formData.shippingAddress.country) newErrors.shippingCountry = 'Required';
    if (!formData.shippingAddress.state) newErrors.shippingState = 'Required';
    if (!validateRequired(formData.shippingAddress.city)) newErrors.shippingCity = 'Required';
    if (!validateZipCode(formData.shippingAddress.zipCode)) newErrors.shippingZipCode = 'Valid ZIP required';

    if (!formData.sameAsBilling) {
      if (!validateRequired(formData.billingAddress.firstName)) newErrors.billingFirstName = 'Required';
      if (!validateRequired(formData.billingAddress.lastName)) newErrors.billingLastName = 'Required';
      if (!formData.billingAddress.addressLine1?.trim()) newErrors.billingAddressLine1 = 'Required';
      if (!formData.billingAddress.country) newErrors.billingCountry = 'Required';
      if (!formData.billingAddress.state) newErrors.billingState = 'Required';
      if (!validateRequired(formData.billingAddress.city)) newErrors.billingCity = 'Required';
      if (!validateZipCode(formData.billingAddress.zipCode)) newErrors.billingZipCode = 'Valid ZIP required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!validateForm()) { setError('Please fix the errors above before continuing.'); return; }

    setLoading(true);
    setError(null);

    try {
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
      const cardNumberElement = elements.getElement(CardNumberElement);

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

      if (stripeError) { setError(stripeError.message); setLoading(false); return; }

      const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id
      });

      if (confirmError) { setError(confirmError.message); setLoading(false); return; }

      if (paymentIntent.status === 'succeeded') {
        const billingAddress = formData.sameAsBilling
          ? {
              fullName: `${formData.shippingAddress.firstName} ${formData.shippingAddress.lastName}`,
              addressLine1: formData.shippingAddress.addressLine1,
              city: formData.shippingAddress.city,
              state: formData.shippingAddress.state,
              zipCode: formData.shippingAddress.zipCode,
              country: formData.shippingAddress.country
            }
          : {
              fullName: `${formData.billingAddress.firstName} ${formData.billingAddress.lastName}`,
              addressLine1: formData.billingAddress.addressLine1,
              city: formData.billingAddress.city,
              state: formData.billingAddress.state,
              zipCode: formData.billingAddress.zipCode,
              country: formData.billingAddress.country
            };

        const orderResponse = await fetch('http://localhost:5000/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify({
            items: cartItems.map(item => ({
              productId: item._id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image
            })),
            total,
            stripePaymentId: paymentIntent.id,
            customerEmail: formData.customerEmail,
            customerPhone: formData.customerPhone,
            shippingAddress: {
              fullName: `${formData.shippingAddress.firstName} ${formData.shippingAddress.lastName}`,
              addressLine1: formData.shippingAddress.addressLine1,
              addressLine2: formData.shippingAddress.addressLine2,
              city: formData.shippingAddress.city,
              state: formData.shippingAddress.state,
              zipCode: formData.shippingAddress.zipCode,
              country: formData.shippingAddress.country
            },
            billingAddress,
            sameAsBilling: formData.sameAsBilling
          })
        });

        if (!orderResponse.ok) throw new Error('Failed to save order');
        const order = await orderResponse.json();
        clearCart();
        navigate(`/order-confirmation/${order._id}`);
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    }
    setLoading(false);
  };

  const AddressFields = ({ prefix, fieldKey }) => (
    <>
      <div className="form-row">
        <div className="form-group">
          <label>First Name *</label>
          <input type="text" name="firstName"
            value={formData[fieldKey].firstName}
            onChange={e => handleInputChange(e, fieldKey, true)}
            placeholder="John"
            className={errors[`${prefix}FirstName`] ? 'error' : ''} />
          {errors[`${prefix}FirstName`] && <span className="field-error">{errors[`${prefix}FirstName`]}</span>}
        </div>
        <div className="form-group">
          <label>Last Name *</label>
          <input type="text" name="lastName"
            value={formData[fieldKey].lastName}
            onChange={e => handleInputChange(e, fieldKey, true)}
            placeholder="Doe"
            className={errors[`${prefix}LastName`] ? 'error' : ''} />
          {errors[`${prefix}LastName`] && <span className="field-error">{errors[`${prefix}LastName`]}</span>}
        </div>
      </div>
      <div className="form-group">
        <label>Address Line 1 *</label>
        <input type="text" name="addressLine1"
          value={formData[fieldKey].addressLine1}
          onChange={e => handleInputChange(e, fieldKey, true)}
          placeholder="123 Main Street"
          className={errors[`${prefix}AddressLine1`] ? 'error' : ''} />
        {errors[`${prefix}AddressLine1`] && <span className="field-error">{errors[`${prefix}AddressLine1`]}</span>}
      </div>
      <div className="form-group">
        <label>Address Line 2 <span style={{ color: '#A0A8B8' }}>(optional)</span></label>
        <input type="text" name="addressLine2"
          value={formData[fieldKey].addressLine2}
          onChange={e => handleInputChange(e, fieldKey, true)}
          placeholder="Apt, suite, unit, etc." />
      </div>
      <div className="form-group">
        <label>Country *</label>
        <select name="country"
          value={formData[fieldKey].country}
          onChange={e => handleInputChange(e, fieldKey, true)}
          className={errors[`${prefix}Country`] ? 'error' : ''}>
          <option value="">Select Country</option>
          {Object.keys(COUNTRIES_STATES).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {errors[`${prefix}Country`] && <span className="field-error">{errors[`${prefix}Country`]}</span>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>State / Province *</label>
          <select name="state"
            value={formData[fieldKey].state}
            onChange={e => handleInputChange(e, fieldKey, true)}
            disabled={!formData[fieldKey].country}
            className={errors[`${prefix}State`] ? 'error' : ''}>
            <option value="">Select State</option>
            {getStatesForCountry(formData[fieldKey].country).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors[`${prefix}State`] && <span className="field-error">{errors[`${prefix}State`]}</span>}
        </div>
        <div className="form-group">
          <label>City *</label>
          <input type="text" name="city"
            value={formData[fieldKey].city}
            onChange={e => handleInputChange(e, fieldKey, true)}
            placeholder="New York"
            className={errors[`${prefix}City`] ? 'error' : ''} />
          {errors[`${prefix}City`] && <span className="field-error">{errors[`${prefix}City`]}</span>}
        </div>
      </div>
      <div className="form-group">
        <label>ZIP / Postal Code *</label>
        <input type="text" name="zipCode"
          value={formData[fieldKey].zipCode}
          onChange={e => handleInputChange(e, fieldKey, true)}
          placeholder="10001"
          className={errors[`${prefix}ZipCode`] ? 'error' : ''} />
        {errors[`${prefix}ZipCode`] && <span className="field-error">{errors[`${prefix}ZipCode`]}</span>}
      </div>
    </>
  );

  return (
    <form onSubmit={handleSubmit}>
      <div className="checkout-form-panel">

        {/* Contact */}
        <div className="form-section">
          <div className="form-section-title">Contact Information</div>
          <div className="form-group">
            <label>Email Address *</label>
            <input type="email" name="customerEmail"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className={errors.customerEmail ? 'error' : ''} />
            {errors.customerEmail && <span className="field-error">{errors.customerEmail}</span>}
          </div>
          <div className="form-group">
            <label>Phone Number <span style={{ color: '#A0A8B8' }}>(optional)</span></label>
            <input type="tel" name="customerPhone"
              value={formData.customerPhone}
              onChange={handleInputChange}
              placeholder="+1 (555) 123-4567"
              className={errors.customerPhone ? 'error' : ''} />
            {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
          </div>
        </div>

        {/* Shipping */}
        <div className="form-section">
          <div className="form-section-title">Shipping Address</div>
          <AddressFields prefix="shipping" fieldKey="shippingAddress" />
        </div>

        {/* Billing */}
        <div className="form-section">
          <div className="form-section-title">Billing Address</div>
          <div className="checkbox-group">
            <input type="checkbox" id="sameAsBilling"
              checked={formData.sameAsBilling}
              onChange={e => setFormData(prev => ({ ...prev, sameAsBilling: e.target.checked }))} />
            <label htmlFor="sameAsBilling">Same as shipping address</label>
          </div>
          {!formData.sameAsBilling && (
            <div style={{ animation: 'slideDown 0.3s ease-out' }}>
              <AddressFields prefix="billing" fieldKey="billingAddress" />
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="form-section">
          <div className="form-section-title">Payment Details</div>
          <div className="card-fields">
            <div className="form-group">
              <label>Card Number</label>
              <CardNumberElement options={cardElementOptions} className="card-input" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Expiry Date</label>
                <CardExpiryElement options={cardElementOptions} className="card-input" />
              </div>
              <div className="form-group">
                <label>CVV / CVC</label>
                <CardCvcElement options={{ ...cardElementOptions, placeholder: '123' }} className="card-input" />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="payment-error">⚠️ {error}</div>}

        <button type="submit" disabled={!stripe || loading} className="pay-button">
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Processing...
            </>
          ) : (
            <> Pay Now ${total.toFixed(2)}</>
          )}
        </button>
      </div>
    </form>
  );
};

// ── Main Checkout Page ─────────────────────────────────────────────────────────
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
        <div className="checkout-content">
          <Elements stripe={stripePromise}>
            <CheckoutForm total={cartTotal} />
          </Elements>
          <OrderSummaryPanel cartItems={cartItems} cartTotal={cartTotal} />
        </div>
      </div>
    </div>
  );
};

export default Checkout;