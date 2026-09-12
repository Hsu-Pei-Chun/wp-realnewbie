interface CompareSide {
  title: string;
  items: string[];
  note?: string;
}

function CompareColumn({ side, emoji }: { side: CompareSide; emoji: string }) {
  return (
    <div>
      <h4 className="mb-4 text-base font-medium tracking-[0.03em]">
        {emoji} {side.title}
      </h4>
      <ul className="space-y-2 text-[15px] leading-[1.9]">
        {side.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {side.note && (
        <p className="mt-5 text-[14px] leading-[1.9] text-muted-foreground">
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
    <div className="not-prose my-[3.5em] grid gap-x-12 gap-y-10 md:grid-cols-2">
      <CompareColumn side={bad} emoji="❌" />
      <CompareColumn side={good} emoji="✅" />
    </div>
  );
}
