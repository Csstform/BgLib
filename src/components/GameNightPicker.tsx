"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Check } from "lucide-react";
import type { PickerGame } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function GameNightPicker({
  gameNightId,
  hostId,
  currentUserId,
  goingUserIds,
  plannedGameIds,
}: {
  gameNightId: string;
  hostId: string;
  currentUserId: string;
  goingUserIds: string[];
  plannedGameIds: string[];
}) {
  const router = useRouter();
  const isHost = currentUserId === hostId;
  const [players, setPlayers] = useState(Math.max(goingUserIds.length, 2));
  const [maxTime, setMaxTime] = useState("120");
  const [games, setGames] = useState<PickerGame[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(plannedGameIds));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams({
      players: String(players),
      attendees: goingUserIds.join(","),
      max_time: maxTime,
    });
    const res = await fetch(`/api/picker?${params}`);
    const data = await res.json();
    setGames(data.games ?? []);
    setLoading(false);
  }, [players, maxTime, goingUserIds]);

  function toggleGame(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function savePlanned() {
    if (!isHost) return;
    setSaving(true);
    await fetch(`/api/game-nights/${gameNightId}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ game_night_id: gameNightId, game_ids: [...selected] }),
    });
    router.refresh();
    setSaving(false);
  }

  if (goingUserIds.length === 0) {
    return (
      <p className="text-sm text-muted">
        No one has RSVP&apos;d &quot;Going&quot; yet — suggestions need at least one attendee.
      </p>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">Suggest games for tonight</p>
      </div>
      <p className="text-xs text-muted">
        Based on {goingUserIds.length} player{goingUserIds.length !== 1 ? "s" : ""} marked Going
      </p>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={1}
          value={players}
          onChange={(e) => setPlayers(parseInt(e.target.value) || 1)}
          className={inputClass}
          placeholder="Players"
        />
        <input
          type="number"
          value={maxTime}
          onChange={(e) => setMaxTime(e.target.value)}
          className={inputClass}
          placeholder="Max min"
        />
      </div>

      <button
        type="button"
        onClick={search}
        disabled={loading}
        className="w-full rounded-lg bg-primary/20 py-2 text-sm font-medium text-primary disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find suggestions"}
      </button>

      {searched && !loading && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {games.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">No matches found</p>
          ) : (
            games.map((g) => (
              <label
                key={g.id}
                className={`flex items-start gap-2 rounded-lg border p-2 cursor-pointer ${
                  selected.has(g.id) ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                {isHost && (
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggleGame(g.id)}
                    className="mt-1 accent-primary"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{g.title}</p>
                  <p className="text-xs text-muted">
                    {g.owner_names?.join(", ")}
                    {g.last_played_at
                      ? ` · Last played ${formatDate(g.last_played_at)}`
                      : " · Never played"}
                  </p>
                </div>
              </label>
            ))
          )}
        </div>
      )}

      {isHost && selected.size > 0 && (
        <button
          type="button"
          onClick={savePlanned}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? "Saving..." : `Set ${selected.size} planned game${selected.size !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
