const stripTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const apiBaseUrl = stripTrailingSlash(process.env.REACT_APP_API_URL || '');
const DEFAULT_STRIPE_PUBLISHABLE_KEY = 'pk_test_51T9n5MHXAZgOY02NKj4S3c7gZ5RB5JpXI8Rnl9ZKc8rJDHzEs6Oc4PfMUYaXggdqxFZ5Xx9HqlANo2Q0WcpMw78N00IgJ9eUI8';

// Keep env override support for deployment, but fall back to the existing local test key
// so checkout does not become unusable if the dev server started before loading .env.
export const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || DEFAULT_STRIPE_PUBLISHABLE_KEY;

export const getApiUrl = (path = '') => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
};
