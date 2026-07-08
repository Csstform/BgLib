"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  gameId: string;
  title: string;
  expansionCount?: number;
};

export function DeleteGameButton({
  gameId,
  title,
  expansionCount = 0,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const lines = [
      `Remove "${title}" from the group library?`,
      "This permanently deletes play history and loan records for this game.",
    ];
    if (expansionCount > 0) {
      lines.push(
        `${expansionCount} linked expansion${expansionCount !== 1 ? "s" : ""} will be kept but unlinked from this base game.`
      );
    }

    if (!confirm(lines.join("\n\n"))) return;

    setLoading(true);
    setError("");

    const res = await fetch(`/api/games/${gameId}`, { method: "DELETE" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to remove game");
      setLoading(false);
      return;
    }

    router.push("/library");
    router.refresh();
  }

  return (
    <div className="border-t border-border pt-4">
      <p className="mb-2 text-sm font-medium text-red-400">Danger zone</p>
      <p className="mb-3 text-xs text-muted">
        Remove this game from your group&apos;s catalogue. Ownership records,
        play history, and loans for this game are deleted.
      </p>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="pressable flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        {loading ? "Removing..." : "Remove from library"}
      </button>
    </div>
  );
}
