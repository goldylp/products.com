import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import './Checkout.css';

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

const parseAddressComponents = (addressComponents) => {
  const result = { addressLine1: '', addressLine2: '', country: '', state: '', city: '', zipCode: '' };
  addressComponents.forEach(component => {
    const types = component.types;
    const longName = component.long_name;
    const shortName = component.short_name;
    if (types.includes('street_number')) result.addressLine1 = longName + ' ' + result.addressLine1;
    if (types.includes('route')) result.addressLine1 += longName;
    if (types.includes('subpremise')) result.addressLine2 = longName;
    if (types.includes('locality')) result.city = longName;
    if (types.includes('administrative_area_level_1')) result.state = longName;
    if (types.includes('postal_code')) result.zipCode = longName;
    if (types.includes('country')) {
      const countryNames = { 'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'AU': 'Australia', 'DE': 'Germany', 'FR': 'France', 'IN': 'India' };
      result.country = countryNames[shortName] || longName;
    }
  });
  return result;
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: '15px',
      color: '#1B1F3B',
      fontFamily: "'Poppins', sans-serif",
      textAlign: 'left',
      '::placeholder': { color: '#A0A8B8', textAlign: 'left' }
    },
    invalid: { color: '#FF6B6B' }
  }
};

// ── Order Summary Panel ────────────────────────────────────────────────────────
const OrderSummaryPanel = ({ cartItems, cartTotal, selectedRate, finalTotal }) => {
  const shippingCost = selectedRate ? selectedRate.price : 0;
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
          <span>{selectedRate ? `Shipping (${selectedRate.service})` : 'Shipping'}</span>
          <span className={selectedRate ? '' : 'free'}>
            {selectedRate ? `$${shippingCost.toFixed(2)}` : 'Calculated after address is entered'}
          </span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <span className="price">${finalTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

// ── Address Fields — defined OUTSIDE CheckoutForm to prevent remount on every render ──
// This is the critical fix for the "can only type 1 character" bug.
// When a component is defined inside another component's render body, React treats it
// as a brand-new component type every render and fully unmounts+remounts it, losing focus.
const AddressFields = ({ prefix, fieldKey, formData, errors, onInputChange, addressRef, getStatesForCountry }) => (
  <>
    <div className="form-row">
      <div className="form-group">
        <label>First Name *</label>
        <input
          type="text"
          name="firstName"
          value={formData[fieldKey].firstName}
          onChange={e => onInputChange(e, fieldKey, true)}
          placeholder="John"
          className={errors[`${prefix}FirstName`] ? 'error' : ''}
        />
        {errors[`${prefix}FirstName`] && <span className="field-error">{errors[`${prefix}FirstName`]}</span>}
      </div>
      <div className="form-group">
        <label>Last Name *</label>
        <input
          type="text"
          name="lastName"
          value={formData[fieldKey].lastName}
          onChange={e => onInputChange(e, fieldKey, true)}
          placeholder="Doe"
          className={errors[`${prefix}LastName`] ? 'error' : ''}
        />
        {errors[`${prefix}LastName`] && <span className="field-error">{errors[`${prefix}LastName`]}</span>}
      </div>
    </div>
    <div className="form-group">
      <label>Address Line 1 *</label>
      <input
        ref={addressRef}
        type="text"
        name="addressLine1"
        value={formData[fieldKey].addressLine1}
        onChange={e => onInputChange(e, fieldKey, true)}
        placeholder="123 Main Street"
        className={errors[`${prefix}AddressLine1`] ? 'error' : ''}
        autoComplete="off"
      />
      {errors[`${prefix}AddressLine1`] && <span className="field-error">{errors[`${prefix}AddressLine1`]}</span>}
    </div>
    <div className="form-group">
      <label>Address Line 2 <span style={{ color: '#A0A8B8' }}>(optional)</span></label>
      <input
        type="text"
        name="addressLine2"
        value={formData[fieldKey].addressLine2}
        onChange={e => onInputChange(e, fieldKey, true)}
        placeholder="Apt, suite, unit, etc."
      />
    </div>
    <div className="form-group">
      <label>Country *</label>
      <select
        name="country"
        value={formData[fieldKey].country}
        onChange={e => onInputChange(e, fieldKey, true)}
        className={errors[`${prefix}Country`] ? 'error' : ''}
      >
        <option value="">Select Country</option>
        {Object.keys(COUNTRIES_STATES).map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      {errors[`${prefix}Country`] && <span className="field-error">{errors[`${prefix}Country`]}</span>}
    </div>
    <div className="form-row">
      <div className="form-group">
        <label>State / Province *</label>
        <select
          name="state"
          value={formData[fieldKey].state}
          onChange={e => onInputChange(e, fieldKey, true)}
          disabled={!formData[fieldKey].country}
          className={errors[`${prefix}State`] ? 'error' : ''}
        >
          <option value="">Select State</option>
          {getStatesForCountry(formData[fieldKey].country).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {errors[`${prefix}State`] && <span className="field-error">{errors[`${prefix}State`]}</span>}
      </div>
      <div className="form-group">
        <label>City *</label>
        <input
          type="text"
          name="city"
          value={formData[fieldKey].city}
          onChange={e => onInputChange(e, fieldKey, true)}
          placeholder="New York"
          className={errors[`${prefix}City`] ? 'error' : ''}
        />
        {errors[`${prefix}City`] && <span className="field-error">{errors[`${prefix}City`]}</span>}
      </div>
    </div>
    <div className="form-group">
      <label>ZIP / Postal Code *</label>
      <input
        type="text"
        name="zipCode"
        value={formData[fieldKey].zipCode}
        onChange={e => onInputChange(e, fieldKey, true)}
        placeholder="10001"
        className={errors[`${prefix}ZipCode`] ? 'error' : ''}
      />
      {errors[`${prefix}ZipCode`] && <span className="field-error">{errors[`${prefix}ZipCode`]}</span>}
    </div>
  </>
);

// ── Checkout Form ──────────────────────────────────────────────────────────────
const CheckoutForm = ({ total, selectedShipping, setSelectedShipping }) => {
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

  // Shipping rates state - use props from parent
  const [shippingRates, setShippingRates] = useState([]);
  const selectedRate = selectedShipping;
  const setSelectedRate = setSelectedShipping;
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState(null);
  const fetchRatesTimer = useRef(null);

  // Refs for Google Places Autocomplete
  const shippingAddress1Ref = useRef(null);
  const billingAddress1Ref = useRef(null);
  const autocompleteInitialized = useRef({ shipping: false, billing: false });
  const googleLoaded = useRef(false);

  // Initialize Google Places Autocomplete - runs once on mount
  useEffect(() => {
    if (googleLoaded.current) return;

    const initAutocomplete = () => {
      if (!window.google || !window.google.maps || !window.google.maps.places) return;
      googleLoaded.current = true;

      const autocompleteOptions = { types: ['address'], fields: ['address_components', 'formatted_address'] };

      if (shippingAddress1Ref.current && !autocompleteInitialized.current.shipping) {
        const shippingAutocomplete = new window.google.maps.places.Autocomplete(shippingAddress1Ref.current, autocompleteOptions);
        shippingAutocomplete.addListener('place_changed', () => {
          const place = shippingAutocomplete.getPlace();
          const parsed = parseAddressComponents(place.address_components);
          setFormData(prev => ({
            ...prev,
            shippingAddress: { ...prev.shippingAddress, ...parsed }
          }));
        });
        autocompleteInitialized.current.shipping = true;
      }

      if (billingAddress1Ref.current && !autocompleteInitialized.current.billing) {
        const billingAutocomplete = new window.google.maps.places.Autocomplete(billingAddress1Ref.current, autocompleteOptions);
        billingAutocomplete.addListener('place_changed', () => {
          const place = billingAutocomplete.getPlace();
          const parsed = parseAddressComponents(place.address_components);
          setFormData(prev => ({
            ...prev,
            billingAddress: { ...prev.billingAddress, ...parsed }
          }));
        });
        autocompleteInitialized.current.billing = true;
      }
    };

    if (window.googleMapsLoaded || (window.google && window.google.maps && window.google.maps.places)) {
      initAutocomplete();
    } else {
      const checkGoogleMaps = setInterval(() => {
        if (window.googleMapsLoaded || (window.google && window.google.maps && window.google.maps.places)) {
          initAutocomplete();
          clearInterval(checkGoogleMaps);
        }
      }, 100);
      setTimeout(() => clearInterval(checkGoogleMaps), 10000);
    }
  }, []);

  // Fetch UPS shipping rates whenever shipping address is complete
  useEffect(() => {
    const addr = formData.shippingAddress;
    const isComplete = addr.country && addr.state && addr.city && addr.zipCode;
    if (!isComplete) {
      setShippingRates([]);
      setSelectedRate(null);
      return;
    }

    // Debounce to avoid too many API calls while typing
    if (fetchRatesTimer.current) clearTimeout(fetchRatesTimer.current);
    fetchRatesTimer.current = setTimeout(async () => {
      setRatesLoading(true);
      setRatesError(null);
      try {
        const res = await fetch('http://localhost:5000/api/shipping/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cartItems.map(item => ({
              productId: item._id,
              name: item.name,
              quantity: item.quantity,
              weight: item.weight || 1
            })),
            address: {
              addressLine1: addr.addressLine1,
              city: addr.city,
              state: addr.state,
              zipCode: addr.zipCode,
              country: addr.country
            }
          })
        });
        const data = await res.json();
        if (data.rates && data.rates.length > 0) {
          setShippingRates(data.rates);
          setSelectedRate(data.rates[0]); // auto-select cheapest
        } else {
          setRatesError('No rates available for this address.');
        }
      } catch (err) {
        setRatesError('Could not fetch shipping rates. Please try again.');
      } finally {
        setRatesLoading(false);
      }
    }, 600);

    return () => { if (fetchRatesTimer.current) clearTimeout(fetchRatesTimer.current); };
  }, [
    formData.shippingAddress.country,
    formData.shippingAddress.state,
    formData.shippingAddress.city,
    formData.shippingAddress.zipCode,
    cartItems
  ]);

  const getStatesForCountry = useCallback((country) => COUNTRIES_STATES[country]?.states || [], []);

  // useCallback so the reference is stable — prevents AddressFields from seeing a new prop on every render
  const handleInputChange = useCallback((e, field, isNested = false) => {
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
  }, [errors]);

  const validateForm = () => {
  const newErrors = {};

  if (!validateEmail(formData.customerEmail)) 
    newErrors.customerEmail = 'Please enter a valid email';
  if (!validatePhone(formData.customerPhone)) 
    newErrors.customerPhone = 'Please enter a valid phone number';
  if (!validateRequired(formData.shippingAddress.firstName)) 
    newErrors.shippingFirstName = 'Please enter first name';
  if (!validateRequired(formData.shippingAddress.lastName)) 
    newErrors.shippingLastName = 'Please enter last name';
  if (!formData.shippingAddress.addressLine1?.trim()) 
    newErrors.shippingAddressLine1 = 'Please enter address';
  if (!formData.shippingAddress.country) 
    newErrors.shippingCountry = 'Please select country';
  if (!formData.shippingAddress.state) 
    newErrors.shippingState = 'Please select state';
  if (!validateRequired(formData.shippingAddress.city)) 
    newErrors.shippingCity = 'Please enter city';
  if (!validateZipCode(formData.shippingAddress.zipCode)) 
    newErrors.shippingZipCode = 'Please enter a valid ZIP code';

  if (!formData.sameAsBilling) {
    if (!validateRequired(formData.billingAddress.firstName)) 
      newErrors.billingFirstName = 'Please enter first name';
    if (!validateRequired(formData.billingAddress.lastName)) 
      newErrors.billingLastName = 'Please enter last name';
    if (!formData.billingAddress.addressLine1?.trim()) 
      newErrors.billingAddressLine1 = 'Please enter address';
    if (!formData.billingAddress.country) 
      newErrors.billingCountry = 'Please select country';
    if (!formData.billingAddress.state) 
      newErrors.billingState = 'Please select state';
    if (!validateRequired(formData.billingAddress.city)) 
      newErrors.billingCity = 'Please enter city';
    if (!validateZipCode(formData.billingAddress.zipCode)) 
      newErrors.billingZipCode = 'Please enter a valid ZIP code';
  }
  if (!selectedRate && shippingRates.length > 0) 
    newErrors.shippingRate = 'Please select a shipping method';
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!validateForm()) {
      setError('Please fix the errors above before continuing.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const shippingAmount = selectedRate ? selectedRate.price : 0;
      const finalTotal = total + shippingAmount;

      const intentRes = await fetch('http://localhost:5000/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal })
      });
      const { clientSecret } = await intentRes.json();

      const cardElement = elements.getElement(CardNumberElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: formData.customerEmail,
            name: `${formData.shippingAddress.firstName} ${formData.shippingAddress.lastName}`
          }
        }
      });

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
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
            total: finalTotal,
            shippingCost: shippingAmount,
            shippingService: selectedRate?.service || 'Standard',
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

  const shippingAddressComplete = !!(
    formData.shippingAddress.country &&
    formData.shippingAddress.state &&
    formData.shippingAddress.city &&
    formData.shippingAddress.zipCode
  );

  const shippingCost = selectedRate ? selectedRate.price : 0;
  const finalTotal = total + shippingCost;

  return (
    <form onSubmit={handleSubmit}>
      <div className="checkout-form-panel">

        {/* Contact */}
        <div className="form-section">
          <div className="form-section-title">Contact Information</div>
          <div className="form-group">
            <label>Email Address *</label>
            <input
              type="email"
              name="customerEmail"
              value={formData.customerEmail}
              onChange={handleInputChange}
              placeholder="your@email.com"
              className={errors.customerEmail ? 'error' : ''}
            />
            {errors.customerEmail && <span className="field-error">{errors.customerEmail}</span>}
          </div>
          <div className="form-group">
            <label>Phone Number <span style={{ color: '#A0A8B8' }}>(optional)</span></label>
            <input
              type="tel"
              name="customerPhone"
              value={formData.customerPhone}
              onChange={handleInputChange}
              placeholder="+1 (555) 123-4567"
              className={errors.customerPhone ? 'error' : ''}
            />
            {errors.customerPhone && <span className="field-error">{errors.customerPhone}</span>}
          </div>
        </div>

        {/* Shipping Address */}
        <div className="form-section">
          <div className="form-section-title">Shipping Address</div>
          <AddressFields
            prefix="shipping"
            fieldKey="shippingAddress"
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            addressRef={shippingAddress1Ref}
            getStatesForCountry={getStatesForCountry}
          />
        </div>

        {/* Billing Address */}
        <div className="form-section">
          <div className="form-section-title">Billing Address</div>
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="sameAsBilling"
              checked={formData.sameAsBilling}
              onChange={e => setFormData(prev => ({ ...prev, sameAsBilling: e.target.checked }))}
            />
            <label htmlFor="sameAsBilling">Same as shipping address</label>
          </div>
          {!formData.sameAsBilling && (
            <div style={{ animation: 'slideDown 0.3s ease-out' }}>
              <AddressFields
                prefix="billing"
                fieldKey="billingAddress"
                formData={formData}
                errors={errors}
                onInputChange={handleInputChange}
                addressRef={billingAddress1Ref}
                getStatesForCountry={getStatesForCountry}
              />
            </div>
          )}
        </div>

        {/* Shipping Rates — displayed above Payment Details */}
        <div className="form-section">
          <div className="form-section-title">Shipping Method</div>
          {!shippingAddressComplete && (
            <div className="shipping-rates-placeholder">
              <span className="shipping-rates-icon">📦</span>
              <p>Complete your shipping address above to see available rates</p>
            </div>
          )}
          {shippingAddressComplete && ratesLoading && (
            <div className="shipping-rates-loading">
              <span className="shipping-spinner" />
              <p>Fetching shipping rates...</p>
            </div>
          )}
          {shippingAddressComplete && !ratesLoading && ratesError && (
            <div className="shipping-rates-error">⚠️ {ratesError}</div>
          )}
          {shippingAddressComplete && !ratesLoading && !ratesError && shippingRates.length > 0 && (
            <>
              <div className="shipping-rates-list">
                {shippingRates.map(rate => (
                  <label
                    key={rate.code}
                    className={`shipping-rate-option ${selectedRate?.code === rate.code ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="shippingRate"
                      value={rate.code}
                      checked={selectedRate?.code === rate.code}
                      onChange={() => setSelectedRate(rate)}
                    />
                    <div className="shipping-rate-info">
                      <span className="shipping-rate-name">{rate.service}</span>
                      <span className="shipping-rate-days">{rate.days}</span>
                    </div>
                    <span className="shipping-rate-price">${rate.price.toFixed(2)}</span>
                  </label>
                ))}
              </div>
              {errors.shippingRate && <span className="field-error" style={{ marginTop: 8 }}>{errors.shippingRate}</span>}
            </>
          )}
        </div>

        {/* Payment Details */}
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
            <> Pay Now ${finalTotal.toFixed(2)}</>
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
  const [selectedShipping, setSelectedShipping] = useState(null);

  if (cartItems.length === 0) {
    navigate('/');
    return null;
  }

  const shippingCost = selectedShipping ? selectedShipping.price : 0;
  const finalTotal = cartTotal + shippingCost;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-content">
          <Elements stripe={stripePromise}>
            <CheckoutForm
              total={cartTotal}
              selectedShipping={selectedShipping}
              setSelectedShipping={setSelectedShipping}
            />
          </Elements>
          <OrderSummaryPanel
            cartItems={cartItems}
            cartTotal={cartTotal}
            selectedRate={selectedShipping}
            finalTotal={finalTotal}
          />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
