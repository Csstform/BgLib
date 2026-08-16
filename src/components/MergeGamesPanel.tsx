"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Merge } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { DuplicateMatch } from "@/lib/types";

export function MergeGamesPanel({
  gameId,
  duplicates,
}: {
  gameId: string;
  duplicates: DuplicateMatch[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingMergeId, setPendingMergeId] = useState<string | null>(null);

  const others = duplicates.filter((d) => d.id !== gameId);
  if (others.length === 0) return null;

  const pendingTitle =
    others.find((d) => d.id === pendingMergeId)?.title ?? "the other entry";

  async function mergeIntoThis(mergeId: string) {
    setLoading(true);
    setError("");
    const res = await fetch("/api/games/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep_id: gameId, merge_ids: [mergeId] }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Merge failed");
    } else {
      setPendingMergeId(null);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Merge className="h-4 w-4 text-amber-400" />
        <p className="font-medium text-sm text-amber-200">Possible duplicates</p>
      </div>
      {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
      <ul className="space-y-2">
        {others.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-2">
            <Link href={`/library/${d.id}`} className="text-sm text-primary hover:underline truncate">
              {d.title}
            </Link>
            <button
              type="button"
              onClick={() => setPendingMergeId(d.id)}
              disabled={loading}
              className="shrink-0 rounded-lg bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary disabled:opacity-50"
            >
              Merge here
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={pendingMergeId !== null}
        title="Merge duplicate?"
        description={`Merge "${pendingTitle}" into this entry? Ownership and history will be combined.`}
        confirmLabel="Merge"
        loading={loading}
        onConfirm={() => pendingMergeId && mergeIntoThis(pendingMergeId)}
        onCancel={() => setPendingMergeId(null)}
      />
    </div>
  );
}
