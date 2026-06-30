"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Sparkles, Users, Clock, Loader2 } from "lucide-react";
import { GameCard } from "@/components/GameCard";
import type { PickerGame, Profile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Member = { user_id: string; profile: Profile };

export function PickerClient({ members }: { members: Member[] }) {
  const [players, setPlayers] = useState(4);
  const [maxTime, setMaxTime] = useState("90");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(() =>
    members.map((m) => m.user_id)
  );
  const [games, setGames] = useState<PickerGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    const params = new URLSearchParams({
      players: String(players),
      attendees: selectedAttendees.join(","),
    });
    if (maxTime) params.set("max_time", maxTime);

    const res = await fetch(`/api/picker?${params}`);
    const data = await res.json();
    setGames(data.games ?? []);
    setLoading(false);
  }, [players, maxTime, selectedAttendees]);

  function toggleAttendee(id: string) {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">What can we play?</h2>
        </div>
        <p className="text-sm text-muted">
          Find games owned by tonight&apos;s players that fit your headcount and
          time. Least recently played games appear first.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <Users className="inline h-4 w-4 mr-1" />
            Players
          </label>
          <input
            type="number"
            min={1}
            max={20}
            value={players}
            onChange={(e) => setPlayers(parseInt(e.target.value) || 1)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <Clock className="inline h-4 w-4 mr-1" />
            Max time (min)
          </label>
          <input
            type="number"
            min={15}
            value={maxTime}
            onChange={(e) => setMaxTime(e.target.value)}
            className={inputClass}
            placeholder="No limit"
          />
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Who&apos;s playing?</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => toggleAttendee(m.user_id)}
              className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                selectedAttendees.includes(m.user_id)
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              {m.profile.display_name}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={search}
        disabled={loading || selectedAttendees.length === 0}
        className="w-full rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Searching...
          </>
        ) : (
          "Find games"
        )}
      </button>

      {searched && !loading && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            {games.length} game{games.length !== 1 ? "s" : ""} found
          </p>
          {games.length === 0 ? (
            <p className="text-center text-muted py-8 text-sm">
              No games match. Try more players, more time, or different
              attendees.
            </p>
          ) : (
            games.map((game) => (
              <div key={game.id}>
                <GameCard game={game} />
                <p className="text-xs text-muted px-1 mt-0.5">
                  Owned by {game.owner_names.join(", ")}
                  {game.last_played_at
                    ? ` · Last played ${formatDate(game.last_played_at)}`
                    : " · Never played in this group"}
                </p>
              </div>
            ))
          )}
          <Link
            href="/plays/new"
            className="block text-center text-sm text-primary hover:underline pt-2"
          >
            Log a play after your game →
          </Link>
        </div>
      )}
    </div>
  );
}
