import Link from "next/link";
import { Plus } from "lucide-react";

export function AddExpansionLink({ baseGameId }: { baseGameId: string }) {
  return (
    <Link
      href={`/add-game?base=${baseGameId}`}
      className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted hover:border-primary hover:text-primary transition-colors"
    >
      <Plus className="h-4 w-4" />
      Add expansion
    </Link>
  );
}
