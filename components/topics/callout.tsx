export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose topic-serif my-[3.2em] border-t border-border pl-[1.5em] pr-2 pt-[1.4em] -indent-[0.5em] text-[1.5rem] font-semibold leading-[1.65] tracking-[0.01em] text-balance">
      {children}
    </aside>
  );
}
