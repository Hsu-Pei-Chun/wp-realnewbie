"use client";

import { useState } from "react";
import {
  CHARSETS,
  type CharsetKey,
  charsetSize,
  combinations,
  formatCombinations,
  formatDuration,
  secondsToCrack,
} from "./password-entropy";

const CHARSET_KEYS = Object.keys(CHARSETS) as CharsetKey[];

export function PasswordEntropyExplorer() {
  const [length, setLength] = useState(8);
  const [enabled, setEnabled] = useState<CharsetKey[]>(["lower"]);

  function toggle(key: CharsetKey) {
    setEnabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const size = charsetSize(enabled);
  const combos = combinations(length, enabled);

  return (
    <div className="not-prose my-8 rounded-lg border bg-muted/40 p-6">
      <p className="text-sm font-medium text-muted-foreground">
        密碼組合數探索器
      </p>

      <div className="mt-4 space-y-4">
        <label className="block text-sm">
          密碼長度：{length} 字元
          <input
            type="range"
            min={4}
            max={20}
            value={length}
            aria-label="密碼長度"
            onChange={(e) => setLength(Number(e.target.value))}
            className="mt-2 w-full accent-foreground"
          />
        </label>

        <div className="flex flex-wrap gap-4">
          {CHARSET_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={enabled.includes(key)}
                onChange={() => toggle(key)}
                className="accent-foreground"
              />
              {CHARSETS[key].label}（{CHARSETS[key].size} 種）
            </label>
          ))}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="mt-4 space-y-1 rounded-md border bg-background p-4 text-sm leading-relaxed"
      >
        {size === 0 ? (
          <p>請至少勾選一種字元</p>
        ) : (
          <>
            <p>字元集大小：{size} 種</p>
            <p>可能的組合：{formatCombinations(combos)}</p>
            <p>一秒十億次要跑：{formatDuration(secondsToCrack(combos))}</p>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        多加一個字元 = 組合數 × 字元集大小；擴大字元集 =
        只是把被乘的數字變大。試試看：長度 +1 和把四種全勾，哪個增加得多？
      </p>
    </div>
  );
}
