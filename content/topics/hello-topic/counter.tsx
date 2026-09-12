"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 範例互動元件：證明 MDX 可以直接 import 同資料夾的 client component。
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="not-prose my-6 flex items-center gap-4 rounded-lg border p-4">
      <Button type="button" onClick={() => setCount((c) => c + 1)}>
        點我
      </Button>
      <span aria-live="polite">已點擊 {count} 次</span>
    </div>
  );
}
