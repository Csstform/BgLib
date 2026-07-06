export default function Loading() {
  return (
    <div className="page-shell animate-fade-in">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-40 rounded-lg bg-surface-2" />
        <div className="h-4 w-56 rounded-md bg-surface-2/70" />
      </div>
      <div className="mb-4 h-11 w-full rounded-xl bg-surface-2" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-xl border border-border bg-surface p-3"
          >
            <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-2" />
            <div className="flex flex-1 flex-col justify-center gap-2 py-1">
              <div className="h-4 w-3/4 rounded-md bg-surface-2" />
              <div className="h-3 w-1/2 rounded-md bg-surface-2/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
