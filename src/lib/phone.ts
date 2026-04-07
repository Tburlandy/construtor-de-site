// Phone utilities

export const sanitizeDigits = (s: string) => (s || '').replace(/\D+/g, '');

export const isValidBRPhone = (digits: string) => {
  const clean = sanitizeDigits(digits);
  return clean.length >= 10 && clean.length <= 11;
};

