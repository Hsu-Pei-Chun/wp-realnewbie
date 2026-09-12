interface CompareSide {
  title: string;
  items: string[];
  note?: string;
}

function CompareColumn({ side, emoji }: { side: CompareSide; emoji: string }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-5">
      <h4 className="mb-3 text-base font-semibold">
        {emoji} {side.title}
      </h4>
      <ul className="space-y-2 text-sm leading-relaxed">
        {side.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {side.note && (
        <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
          {side.note}
        </p>
      )}
    </div>
  );
}

export function Compare({
  bad,
  good,
}: {
  bad: CompareSide;
  good: CompareSide;
}) {
  return (
    <div className="not-prose my-8 grid gap-4 md:grid-cols-2">
      <CompareColumn side={bad} emoji="❌" />
      <CompareColumn side={good} emoji="✅" />
    </div>
  );
}
