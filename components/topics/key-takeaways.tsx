export function KeyTakeaways({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className="not-prose my-[3.5em] space-y-4">
      {items.map((item, index) => (
        <li key={item} className="flex gap-4 text-[0.9375rem] leading-[1.9]">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
