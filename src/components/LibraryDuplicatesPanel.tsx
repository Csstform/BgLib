"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ChevronDown, ChevronUp, Merge } from "lucide-react";
import type { DuplicateCluster } from "@/lib/duplicate-detection";

export function LibraryDuplicatesPanel({
  clusters,
}: {
  clusters: DuplicateCluster[];
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [keepers, setKeepers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const c of clusters) {
      initial[c.id] = c.games[0]?.id ?? "";
    }
    return initial;
  });
  const [error, setError] = useState("");

  if (clusters.length === 0) return null;

  const totalDupes = clusters.reduce((n, c) => n + c.games.length, 0);

  async function mergeCluster(cluster: DuplicateCluster) {
    const keepId = keepers[cluster.id];
    const mergeIds = cluster.games.map((g) => g.id).filter((id) => id !== keepId);
    if (!keepId || mergeIds.length === 0) return;

    if (
      !confirm(
        `Merge ${mergeIds.length} duplicate entr${mergeIds.length === 1 ? "y" : "ies"} into the selected game? Ownership and play history will be combined.`
      )
    ) {
      return;
    }

    setLoadingId(cluster.id);
    setError("");
    const res = await fetch("/api/games/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep_id: keepId, merge_ids: mergeIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Merge failed");
    } else {
      router.refresh();
    }
    setLoadingId(null);
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="text-sm font-medium text-amber-100">
            {clusters.length} possible duplicate group
            {clusters.length !== 1 ? "s" : ""} ({totalDupes} entries)
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-amber-500/20 px-4 pb-4 space-y-4">
          {error && (
            <p className="text-xs text-red-400 pt-2">{error}</p>
          )}
          {clusters.map((cluster) => (
            <div key={cluster.id} className="pt-2">
              <p className="text-xs text-amber-200/80 mb-2">{cluster.label}</p>
              <ul className="space-y-1.5 mb-2">
                {cluster.games.map((g) => (
                  <li key={g.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`keep-${cluster.id}`}
                      checked={keepers[cluster.id] === g.id}
                      onChange={() =>
                        setKeepers((prev) => ({ ...prev, [cluster.id]: g.id }))
                      }
                      className="accent-primary"
                    />
                    <Link
                      href={`/library/${g.id}`}
                      className="text-sm text-primary hover:underline truncate"
                    >
                      {g.title}
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => mergeCluster(cluster)}
                disabled={loadingId === cluster.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-1.5 text-xs font-medium text-primary disabled:opacity-50"
              >
                <Merge className="h-3.5 w-3.5" />
                {loadingId === cluster.id ? "Merging…" : "Merge into selected"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
