export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose my-8 border-l-4 border-foreground/70 bg-muted/40 py-4 pl-5 pr-4 text-lg font-medium leading-relaxed">
      {children}
    </aside>
  );
}
