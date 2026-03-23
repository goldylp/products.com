// Utility to capture UTM parameters and fbclid from URL

const FB_PIXEL_ID = process.env.REACT_APP_FB_PIXEL_ID || '';

export const getTrackingData = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    fbclid: params.get('fbclid') || ''
  };
};

// Track event with Meta Pixel
export const trackEvent = (eventName, data = {}) => {
  if (typeof window !== 'undefined' && window.fbq && FB_PIXEL_ID) {
    window.fbq('track', eventName, data);
  }
};

// Track Lead event
export const trackLead = (leadData = {}) => {
  trackEvent('Lead', leadData);
};

// Initialize Meta Pixel
export const initMetaPixel = () => {
  if (typeof window !== 'undefined' && FB_PIXEL_ID && !window.fbq?.initialized) {
    // Initialize Pixel
    if (window.fbq) {
      window.fbq('init', FB_PIXEL_ID);
      window.fbq.initialized = true;
    }
  }
};