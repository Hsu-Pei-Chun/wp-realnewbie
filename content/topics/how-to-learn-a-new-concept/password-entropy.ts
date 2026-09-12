export const CHARSETS = {
  lower: { label: "小寫字母", size: 26 },
  upper: { label: "大寫字母", size: 26 },
  digits: { label: "數字", size: 10 },
  symbols: { label: "特殊符號", size: 33 },
} as const;

export type CharsetKey = keyof typeof CHARSETS;

export const GUESSES_PER_SECOND = 1e9;

export function charsetSize(enabled: CharsetKey[]): number {
  return enabled.reduce((sum, key) => sum + CHARSETS[key].size, 0);
}

export function combinations(length: number, enabled: CharsetKey[]): number {
  const size = charsetSize(enabled);
  if (size === 0 || length === 0) return 0;
  return size ** length;
}

export function secondsToCrack(
  combos: number,
  rate: number = GUESSES_PER_SECOND
): number {
  return combos / rate;
}

const THOUSANDS_FORMATTER = new Intl.NumberFormat("zh-TW");

export function formatCombinations(n: number): string {
  if (n === 0) return "0";
  if (n < 1e4) return THOUSANDS_FORMATTER.format(n);
  const [mantissa, exponent] = n.toExponential(1).split("e");
  const exp = Number(exponent);
  return `≈ ${mantissa} × 10^${exp}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return "不到 1 秒";
  if (seconds < 60) return `約 ${Math.round(seconds)} 秒`;
  if (seconds < 3600) return `約 ${Math.round(seconds / 60)} 分鐘`;
  if (seconds < 86400) return `約 ${Math.round(seconds / 3600)} 小時`;

  const YEAR_SECONDS = 365.25 * 86400;
  if (seconds < YEAR_SECONDS) return `約 ${Math.round(seconds / 86400)} 天`;

  const years = seconds / YEAR_SECONDS;
  if (years < 1e6) {
    return `約 ${THOUSANDS_FORMATTER.format(Math.round(years))} 年`;
  }
  return "超過 100 萬年";
}
