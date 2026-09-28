export interface FixedTask {
  name: string;
  minDays: number;
  maxDays: number;
}

export const FIXED_TASKS: FixedTask[] = [
  { name: "蛋糕列表頁", minDays: 1, maxDays: 2 },
  { name: "取貨日期", minDays: 1, maxDays: 2 },
  { name: "串接付款", minDays: 2, maxDays: 3 },
];

export const CUSTOMIZATION_MIN_DAYS = 2;
export const CUSTOMIZATION_MAX_DAYS = 14;

export const HOURS_PER_DAY = 8;
export const BUFFER_MIN = 1.3;
export const BUFFER_MAX = 1.5;

export interface Range {
  min: number;
  max: number;
}

export function fixedDaysTotal(): Range {
  return FIXED_TASKS.reduce(
    (acc, task) => ({
      min: acc.min + task.minDays,
      max: acc.max + task.maxDays,
    }),
    { min: 0, max: 0 }
  );
}

export function totalDaysRange(customizationDays: number): Range {
  const fixed = fixedDaysTotal();
  return {
    min: fixed.min + customizationDays,
    max: fixed.max + customizationDays,
  };
}

export function hoursRange(
  days: Range,
  hoursPerDay: number = HOURS_PER_DAY
): Range {
  return { min: days.min * hoursPerDay, max: days.max * hoursPerDay };
}

export function quoteRange(hours: Range, hourlyWage: number): Range {
  return {
    min: hours.min * BUFFER_MIN * hourlyWage,
    max: hours.max * BUFFER_MAX * hourlyWage,
  };
}

const THOUSANDS_FORMATTER = new Intl.NumberFormat("zh-TW");

export function formatCurrency(n: number): string {
  return `${THOUSANDS_FORMATTER.format(Math.round(n))} 元`;
}
