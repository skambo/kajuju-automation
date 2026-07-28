const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Accepts +254712345678 or 0712345678 once spacing/dashes are stripped.
const PHONE_RE = /^(\+?\d{1,3})?\d{9,10}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const stripped = value.trim().replace(/[\s-]/g, '');
  return PHONE_RE.test(stripped);
}
