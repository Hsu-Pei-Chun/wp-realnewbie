"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface QuizOption {
  label: string;
  correct?: boolean;
  explanation: string;
}

export function Quiz({
  question,
  options,
}: {
  question: string;
  options: QuizOption[];
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selected = selectedIndex !== null ? options[selectedIndex] : null;
  const correctOption = options.find((option) => option.correct);

  return (
    <div className="not-prose my-[3.5em] rounded-lg border p-6 md:p-8">
      <p className="text-sm font-medium text-muted-foreground">自我檢驗</p>
      <p className="mt-2 text-base font-semibold leading-relaxed">{question}</p>

      <div className="mt-4 space-y-2">
        {options.map((option, index) => {
          const isSelected = selectedIndex === index;
          return (
            <button
              key={option.label}
              type="button"
              disabled={selected !== null}
              aria-pressed={isSelected}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "w-full rounded-md border bg-background px-4 py-3 text-left text-sm hover:border-foreground/40",
                isSelected && "border-foreground"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-md border bg-background p-4 text-sm leading-relaxed"
        >
          <p>{selected.correct ? "✅ 答對了" : "❌ 再想想"}</p>
          <p className="mt-2">{selected.explanation}</p>
          {!selected.correct && correctOption && (
            <>
              <p className="mt-2">正確答案：{correctOption.label}</p>
              <p className="mt-2">{correctOption.explanation}</p>
            </>
          )}
        </div>
      )}

      {selected && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setSelectedIndex(null)}
        >
          重新作答
        </Button>
      )}
    </div>
  );
}
