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
