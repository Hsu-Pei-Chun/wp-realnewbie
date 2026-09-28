"use client";

import { useState } from "react";
import {
  CUSTOMIZATION_MAX_DAYS,
  CUSTOMIZATION_MIN_DAYS,
  FIXED_TASKS,
  formatCurrency,
  hoursRange,
  quoteRange,
  totalDaysRange,
} from "./quote-range";

export function QuoteRangeCalculator() {
  const [customizationDays, setCustomizationDays] = useState(
    CUSTOMIZATION_MIN_DAYS
  );
  const [hourlyWage, setHourlyWage] = useState(1200);

  const days = totalDaysRange(customizationDays);
  const hours = hoursRange(days);
  const quote = quoteRange(hours, hourlyWage);

  return (
    <div className="not-prose my-[3.5em] rounded-lg border p-6 md:p-8">
      <p className="text-sm font-medium text-muted-foreground">
        報價區間計算器
      </p>

      <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
        {FIXED_TASKS.map((task) => (
          <li key={task.name}>
            {task.name}：{task.minDays}～{task.maxDays} 天
          </li>
        ))}
      </ul>

      <div className="mt-4 space-y-4">
        <label className="block text-sm">
          客製化複雜度：{customizationDays} 天
          <input
            type="range"
            min={CUSTOMIZATION_MIN_DAYS}
            max={CUSTOMIZATION_MAX_DAYS}
            value={customizationDays}
            aria-label="客製化複雜度"
            onChange={(e) => setCustomizationDays(Number(e.target.value))}
            className="mt-2 w-full accent-foreground"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>固定選項勾選</span>
            <span>上傳圖片人工審核</span>
          </div>
        </label>

        <label className="block text-sm">
          時薪
          <input
            type="number"
            min={0}
            step={100}
            value={hourlyWage}
            aria-label="時薪"
            onChange={(e) => setHourlyWage(Number(e.target.value))}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2"
          />
        </label>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="mt-4 space-y-1 rounded-md border bg-background p-4 text-sm leading-relaxed"
      >
        <p>
          總工時區間：{hours.min}～{hours.max} 小時
        </p>
        <p>
          報價區間：{formatCurrency(quote.min)} ～ {formatCurrency(quote.max)}
        </p>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        客製化複雜度每往上調整，區間會跟著放大——這就是「資訊不足時不給時程」的原因。
      </p>
    </div>
  );
}
