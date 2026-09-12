export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <aside className="not-prose mx-auto my-[5em] max-w-[22em] text-balance text-center text-[1.375rem] font-medium leading-[1.7] tracking-[0.03em]">
      {children}
    </aside>
  );
}
