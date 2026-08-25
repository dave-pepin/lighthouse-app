// Normalizes a US phone number into the +1XXXXXXXXXX (E.164) format Twilio
// requires. Returns null if the input can't be confidently normalized —
// callers should treat that as "invalid" rather than silently sending it on.
export function toE164(input) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Already looks like a full international number — trust it as-is.
  if (/^\+[1-9]\d{7,14}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

// Formats a US phone number as the user types, e.g. "7126355945" ->
// "(712) 635-5945" — for display-only fields (office/cell/fax) where
// what's typed is exactly what gets saved and shown, unlike
// sms_phone_number's E.164 storage. Progressively adds punctuation as
// more digits arrive rather than waiting for all 10, and ignores
// anything past the 10th digit (no country code or extension support).
export function formatUSPhoneInput(value) {
  const digits = (value || "").replace(/\D/g, "").slice(0, 10);

  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
