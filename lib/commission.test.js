import { describe, it, expect } from "vitest";
import { calculateCommission, summarizeCommissions, formatCurrency, formatCompactCurrency, parseAmount } from "./commission";

describe("calculateCommission", () => {
  it("computes a percentage commission with a referral fee off the gross", () => {
    const c = calculateCommission({ sale_price: 400000, commission_type: "percent", commission_percent: 3, referral_percent: 25 });
    expect(c.gross).toBe(12000);
    expect(c.referralFee).toBe(3000);
    expect(c.net).toBe(9000);
    expect(c.effectivePercent).toBe(3);
  });

  it("uses the flat amount, and derives an effective rate from the price", () => {
    const c = calculateCommission({ sale_price: 500000, commission_type: "flat", commission_flat: 10000 });
    expect(c.gross).toBe(10000);
    expect(c.referralFee).toBe(0);
    expect(c.net).toBe(10000);
    expect(c.effectivePercent).toBe(2);
  });

  it("has no commission until both price and rate are known", () => {
    expect(calculateCommission({ sale_price: 400000, commission_type: "percent" }).net).toBeNull();
    expect(calculateCommission({ commission_type: "percent", commission_percent: 3 }).net).toBeNull();
    expect(calculateCommission(null).net).toBeNull();
  });

  it("allows a flat fee with no price, but then has no effective rate", () => {
    const c = calculateCommission({ commission_type: "flat", commission_flat: 5000 });
    expect(c.net).toBe(5000);
    expect(c.effectivePercent).toBeNull();
  });

  it("accepts numeric strings, as Supabase returns for numeric columns", () => {
    const c = calculateCommission({ sale_price: "300000", commission_type: "percent", commission_percent: "2.5" });
    expect(c.gross).toBe(7500);
  });
});

describe("summarizeCommissions", () => {
  it("totals volume, commission and referral fees, and averages the rates", () => {
    const summary = summarizeCommissions([
      { financials: { sale_price: 400000, commission_type: "percent", commission_percent: 3, referral_percent: 25 } },
      { financials: { sale_price: 500000, commission_type: "flat", commission_flat: 10000 } },
      { financials: { sale_price: 250000, commission_type: "percent" } },
      { financials: null },
    ]);
    expect(summary.count).toBe(4);
    expect(summary.volume).toBe(1150000);
    expect(summary.gross).toBe(22000);
    expect(summary.referralFees).toBe(3000);
    expect(summary.net).toBe(19000);
    expect(summary.averagePercent).toBe(2.5);
  });

  it("has no average when nothing is priced", () => {
    expect(summarizeCommissions([]).averagePercent).toBeNull();
  });
});

describe("formatCurrency", () => {
  it("drops cents on whole dollars and keeps them otherwise", () => {
    expect(formatCurrency(450000)).toBe("$450,000");
    expect(formatCurrency(13500.5)).toBe("$13,500.50");
  });
});

describe("formatCompactCurrency", () => {
  it("abbreviates thousands and millions", () => {
    expect(formatCompactCurrency(1234567)).toBe("$1.2M");
    expect(formatCompactCurrency(27000)).toBe("$27K");
    expect(formatCompactCurrency(850)).toBe("$850");
    expect(formatCompactCurrency(0)).toBe("$0");
  });
});

describe("parseAmount", () => {
  it("strips dollar signs, commas and percent signs", () => {
    expect(parseAmount("$450,000")).toBe(450000);
    expect(parseAmount("3%")).toBe(3);
    expect(parseAmount("  ")).toBeNull();
    expect(parseAmount("abc")).toBeNaN();
  });
});
