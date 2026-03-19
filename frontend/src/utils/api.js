const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const apiBaseUrl = stripTrailingSlash(process.env.REACT_APP_API_URL || '');

export const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';

export const getApiUrl = (path = '') => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};
