export function PlaysTrendChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-muted tabular-nums">{d.count}</span>
          <div
            className="w-full rounded-t bg-primary/80 min-h-[4px] transition-all"
            style={{ height: `${Math.max(8, (d.count / max) * 72)}px` }}
          />
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
