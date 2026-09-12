"use client";

import { useState } from "react";
import { describeOutcome, hedgeOutcome, LOCKED_PRICE } from "./futures-hedge";

export function FuturesHedgeSimulator() {
  const [market, setMarket] = useState(130);

  const outcome = hedgeOutcome(market);

  return (
    <div className="not-prose my-8 rounded-lg border bg-muted/40 p-6">
      <p className="text-sm font-medium text-muted-foreground">
        期貨避險模擬器
      </p>
      <p className="mt-2 text-sm">春天鎖定的價格：每單位 {LOCKED_PRICE} 元</p>

      <label className="mt-4 block text-sm">
        秋天的實際市價：{market} 元
        <input
          type="range"
          min={40}
          max={160}
          step={5}
          value={market}
          aria-label="秋天的實際市價"
          onChange={(e) => setMarket(Number(e.target.value))}
          className="mt-2 w-full accent-foreground"
        />
      </label>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border bg-background p-4 text-sm">
          <p className="font-medium">農民（賣方）</p>
          <p className="mt-2">沒鎖價的收入：{outcome.farmer.unhedged} 元</p>
          <p>鎖價後的收入：{outcome.farmer.hedged} 元</p>
        </div>
        <div className="rounded-md border bg-background p-4 text-sm">
          <p className="font-medium">加工廠（買方）</p>
          <p className="mt-2">沒鎖價的成本：{outcome.factory.unhedged} 元</p>
          <p>鎖價後的成本：{outcome.factory.hedged} 元</p>
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="mt-4 rounded-md border bg-background p-4 text-sm leading-relaxed"
      >
        {describeOutcome(market)}
      </p>

      <p className="mt-4 text-xs text-muted-foreground">
        不管往哪邊拉，鎖價的那一邊都是
        100。放棄的那一段差額，就是買可預測性付的保險費。
      </p>
    </div>
  );
}
