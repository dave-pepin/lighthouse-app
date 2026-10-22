// Commission math for the Business Tracker — shared by the Journey page's
// commission panel and the Bridge totals so they can never disagree.
// `financials` is a journey_financials row (or null). Percentages are whole
// numbers (3 = 3%); the referral fee is a share of the gross commission.

const toNumber = (value) => (value == null || value === "" ? null : Number(value));

export function calculateCommission(financials) {
  const salePrice = toNumber(financials?.sale_price);
  const type = financials?.commission_type === "flat" ? "flat" : "percent";
  const percent = toNumber(financials?.commission_percent);
  const flat = toNumber(financials?.commission_flat);
  const referralPercent = toNumber(financials?.referral_percent) || 0;

  let gross = null;
  if (type === "flat") gross = flat;
  else if (salePrice != null && percent != null) gross = (salePrice * percent) / 100;

  if (gross == null) {
    return { salePrice, gross: null, referralFee: null, net: null, effectivePercent: null };
  }

  const referralFee = (gross * referralPercent) / 100;
  return {
    salePrice,
    gross,
    referralFee,
    net: gross - referralFee,
    // A flat fee still has an implied rate, so it can count toward the
    // Bridge's average commission percentage alongside percent deals.
    effectivePercent: salePrice ? (gross / salePrice) * 100 : null,
  };
}

// Totals for one group of Journeys (each carrying `financials`). Volume
// counts every priced deal; the average percentage only counts deals that
// have both a price and a commission.
export function summarizeCommissions(journeys) {
  let volume = 0;
  let gross = 0;
  let referralFees = 0;
  let net = 0;
  const rates = [];

  for (const journey of journeys) {
    const c = calculateCommission(journey.financials);
    if (c.salePrice != null) volume += c.salePrice;
    if (c.gross == null) continue;
    gross += c.gross;
    referralFees += c.referralFee;
    net += c.net;
    if (c.effectivePercent != null) rates.push(c.effectivePercent);
  }

  return {
    count: journeys.length,
    volume,
    gross,
    referralFees,
    net,
    averagePercent: rates.length ? rates.reduce((sum, r) => sum + r, 0) / rates.length : null,
  };
}

// "$450,000" / "$13,500.50" — cents only when there are any.
export function formatCurrency(amount) {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// "$1.2M" / "$27K" / "$850" — for the narrow Sidebar tracker.
export function formatCompactCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: amount >= 1000 ? 1 : 0,
  }).format(amount);
}

export function formatPercent(value) {
  return `${Number(value.toFixed(2))}%`;
}

// Lenient parse for what an agent types: "$450,000", "3%", " 2.5 ".
// Returns null for blank, NaN for anything that isn't a number.
export function parseAmount(text) {
  const cleaned = String(text ?? "").replace(/[$,%\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
