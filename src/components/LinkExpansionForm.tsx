"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2 } from "lucide-react";
import type { Game } from "@/lib/types";

export function LinkExpansionForm({
  expansionId,
  expansionTitle,
  baseGames,
}: {
  expansionId: string;
  expansionTitle: string;
  baseGames: Pick<Game, "id" | "title">[];
}) {
  const router = useRouter();
  const [baseGameId, setBaseGameId] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function tryAutoLink() {
    setAutoLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/games/relink-expansions", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Auto-link failed");
      setAutoLoading(false);
      return;
    }

    if ((data.linked ?? 0) > 0) {
      router.refresh();
      return;
    }

    setError("Could not find a matching base game. Link manually below.");
    setAutoLoading(false);
  }

  async function linkManual(e: React.FormEvent) {
    e.preventDefault();
    if (!baseGameId) return;

    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/games/${expansionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_game_id: baseGameId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to link expansion");
      setLoading(false);
      return;
    }

    setSuccess("Expansion linked.");
    router.refresh();
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-medium text-amber-200">
          Link to base game
        </p>
      </div>
      <p className="text-xs text-muted">
        &ldquo;{expansionTitle}&rdquo; isn&apos;t attached to a base game in
        your library yet.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-green-400">{success}</p>}

      <button
        type="button"
        onClick={tryAutoLink}
        disabled={autoLoading || loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/20 py-2 text-sm font-medium text-primary disabled:opacity-50"
      >
        {autoLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Try auto-link via BGG
      </button>

      {baseGames.length > 0 && (
        <form onSubmit={linkManual} className="space-y-2">
          <label className="block text-xs font-medium text-muted">
            Or choose the base game manually
          </label>
          <select
            value={baseGameId}
            onChange={(e) => setBaseGameId(e.target.value)}
            className={inputClass}
            required
          >
            <option value="">Select base game</option>
            {baseGames.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || autoLoading || !baseGameId}
            className="w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {loading ? "Linking..." : "Link expansion"}
          </button>
        </form>
      )}
    </div>
  );
}
