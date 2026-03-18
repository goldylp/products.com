export const isNonEmpty = (value) => String(value ?? '').trim().length > 0;

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

export const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

export const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

export const isValidImageReference = (value) => {
  const normalized = String(value ?? '').trim();
  return /^https?:\/\/\S+$/i.test(normalized) || /^\/uploads\/.+/i.test(normalized);
};
