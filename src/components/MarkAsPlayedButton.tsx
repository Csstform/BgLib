"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, CheckCircle2 } from "lucide-react";

export function MarkAsPlayedButton({
  playGameId,
  expansionId,
  userId,
  isFirstPlay = false,
}: {
  playGameId: string;
  expansionId?: string;
  userId: string;
  isFirstPlay?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playId, setPlayId] = useState<string | null>(null);

  async function markPlayed() {
    setLoading(true);
    setError("");
    setPlayId(null);

    const res = await fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: playGameId,
        played_at: new Date().toISOString(),
        first_time_played: isFirstPlay,
        participants: [{ user_id: userId }],
        expansion_ids: expansionId ? [expansionId] : [],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not mark as played");
      setLoading(false);
      return;
    }

    setPlayId(data.id);
    setLoading(false);
    router.refresh();
  }

  if (playId) {
    return (
      <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-green-300">
          <CheckCircle2 className="h-4 w-4" />
          Marked as played
        </p>
        <Link
          href={`/plays/${playId}/edit`}
          className="mt-2 block text-center text-xs text-primary hover:underline"
        >
          Add winners, scores, or notes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={markPlayed}
        disabled={loading}
        className="pressable flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        {loading ? "Saving..." : "Mark as played"}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-400">{error}</p>}
    </div>
  );
}
