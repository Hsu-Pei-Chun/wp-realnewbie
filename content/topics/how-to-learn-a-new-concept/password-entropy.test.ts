import { describe, expect, it } from "vitest";
import {
  charsetSize,
  combinations,
  formatCombinations,
  formatDuration,
  secondsToCrack,
} from "./password-entropy";

describe("charsetSize", () => {
  it("sums the sizes of all four charsets", () => {
    expect(charsetSize(["lower", "upper", "digits", "symbols"])).toBe(95);
  });

  it("returns 0 when no charset is enabled", () => {
    expect(charsetSize([])).toBe(0);
  });
});

describe("combinations", () => {
  it("is charsetSize ** length for a single charset", () => {
    expect(combinations(8, ["lower"])).toBe(26 ** 8);
  });

  it("grows by several tens of thousands when all charsets are enabled", () => {
    const lowerOnly = combinations(8, ["lower"]);
    const all = combinations(8, ["lower", "upper", "digits", "symbols"]);
    expect(all / lowerOnly).toBeGreaterThan(30000);
  });

  it("is 0 when length is 0", () => {
    expect(combinations(0, ["lower"])).toBe(0);
  });

  it("is 0 when no charset is enabled", () => {
    expect(combinations(8, [])).toBe(0);
  });
});

describe("formatCombinations", () => {
  it('formats 0 as "0"', () => {
    expect(formatCombinations(0)).toBe("0");
  });

  it("formats small numbers with thousands separators", () => {
    expect(formatCombinations(1234)).toBe("1,234");
  });

  it("formats large numbers in scientific notation with 2 significant digits", () => {
    expect(formatCombinations(26 ** 8)).toMatch(/≈ 2\.1 × 10\^11/);
  });
});

describe("formatDuration", () => {
  it("formats sub-second durations", () => {
    expect(formatDuration(0.5)).toBe("不到 1 秒");
  });

  it("formats seconds", () => {
    expect(formatDuration(59)).toBe("約 59 秒");
  });

  it("formats minutes, rounding up boundary values", () => {
    expect(formatDuration(90)).toBe("約 2 分鐘");
  });

  it("formats hours", () => {
    expect(formatDuration(7200)).toBe("約 2 小時");
  });

  it("formats days", () => {
    expect(formatDuration(3 * 86400)).toBe("約 3 天");
  });

  it("formats years", () => {
    expect(formatDuration(2 * 365.25 * 86400)).toBe("約 2 年");
  });

  it("formats extremely long durations as over a million years", () => {
    expect(formatDuration(1e7 * 365.25 * 86400)).toBe("超過 100 萬年");
  });
});

describe("secondsToCrack", () => {
  it("divides combinations by the guess rate", () => {
    expect(secondsToCrack(1e9)).toBe(1);
  });
});
