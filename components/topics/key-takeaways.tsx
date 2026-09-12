export function KeyTakeaways({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ol className="not-prose my-8 space-y-3 rounded-lg border bg-muted/40 p-6">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}
