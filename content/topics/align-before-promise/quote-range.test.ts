import { describe, expect, it } from "vitest";
import {
  fixedDaysTotal,
  formatCurrency,
  hoursRange,
  quoteRange,
  totalDaysRange,
} from "./quote-range";

describe("fixedDaysTotal", () => {
  it("sums the min and max days of all fixed tasks", () => {
    expect(fixedDaysTotal()).toEqual({ min: 4, max: 7 });
  });
});

describe("totalDaysRange", () => {
  it("adds customization days to both ends of the fixed range", () => {
    expect(totalDaysRange(2)).toEqual({ min: 6, max: 9 });
  });

  it("widens the range when customization is at its most complex", () => {
    expect(totalDaysRange(14)).toEqual({ min: 18, max: 21 });
  });
});

describe("hoursRange", () => {
  it("multiplies days by hours per day", () => {
    expect(hoursRange({ min: 6, max: 9 })).toEqual({ min: 48, max: 72 });
  });
});

describe("quoteRange", () => {
  it("applies the low buffer to the min hours and the high buffer to the max hours", () => {
    expect(quoteRange({ min: 48, max: 72 }, 1200)).toEqual({
      min: 48 * 1.3 * 1200,
      max: 72 * 1.5 * 1200,
    });
  });
});

describe("formatCurrency", () => {
  it("formats with thousands separators and a 元 suffix", () => {
    expect(formatCurrency(74880)).toBe("74,880 元");
  });

  it("rounds to the nearest whole number", () => {
    expect(formatCurrency(129599.6)).toBe("129,600 元");
  });
});
