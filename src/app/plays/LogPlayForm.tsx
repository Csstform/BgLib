"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { Game, Profile } from "@/lib/types";
import { GameSelect } from "@/components/GameSelect";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/utils";

type Member = { user_id: string; profile: Profile };

type ExpansionOption = {
  id: string;
  title: string;
  owner_names: string[];
};

export function LogPlayForm({
  games,
  expansionsByBase,
  members,
  userId,
  preselectedGameId,
  preselectedExpansionId,
  playId,
  submitLabel,
  initialPlayedAt,
  initialDuration,
  initialNotes,
  initialParticipants,
  initialWinners,
  initialScores,
  initialExpansionIds,
  initialFirstTimePlayed,
}: {
  groupId: string;
  games: Game[];
  expansionsByBase: Record<string, ExpansionOption[]>;
  members: Member[];
  userId: string;
  preselectedGameId?: string;
  preselectedExpansionId?: string;
  playId?: string;
  submitLabel?: string;
  initialPlayedAt?: string;
  initialDuration?: string;
  initialNotes?: string;
  initialParticipants?: string[];
  initialWinners?: string[];
  initialScores?: Record<string, string>;
  initialExpansionIds?: string[];
  initialFirstTimePlayed?: boolean;
}) {
  const router = useRouter();
  const [gameId, setGameId] = useState(preselectedGameId ?? "");
  const [selectedExpansions, setSelectedExpansions] = useState<string[]>(
    preselectedExpansionId
      ? [preselectedExpansionId]
      : (initialExpansionIds ?? [])
  );
  const [playedAt, setPlayedAt] = useState(
    initialPlayedAt ?? toDatetimeLocalValue()
  );
  const [duration, setDuration] = useState(initialDuration ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [participants, setParticipants] = useState<string[]>(
    initialParticipants ?? [userId]
  );
  const [winners, setWinners] = useState<string[]>(initialWinners ?? []);
  const [scores, setScores] = useState<Record<string, string>>(
    initialScores ?? {}
  );
  const [firstTimePlayed, setFirstTimePlayed] = useState(
    initialFirstTimePlayed ?? false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const playableGames = useMemo(
    () => games.filter((g) => !g.base_game_id),
    [games]
  );

  const availableExpansions = useMemo(
    () => (gameId ? expansionsByBase[gameId] ?? [] : []),
    [gameId, expansionsByBase]
  );

  function handleGameChange(nextGameId: string) {
    setGameId(nextGameId);
    setSelectedExpansions([]);
  }

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (!next.includes(id)) {
        setWinners((w) => w.filter((x) => x !== id));
        setScores((s) => {
          const copy = { ...s };
          delete copy[id];
          return copy;
        });
      }
      return next;
    });
  }

  function toggleWinner(id: string) {
    if (!participants.includes(id)) return;
    setWinners((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleExpansion(id: string) {
    setSelectedExpansions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId) return;
    setLoading(true);
    setError("");

    const participantPayload = participants.map((uid) => {
      const rawScore = scores[uid]?.trim();
      let score: number | null = null;
      if (rawScore) {
        const parsed = parseInt(rawScore, 10);
        if (Number.isFinite(parsed)) score = parsed;
      }
      return {
        user_id: uid,
        is_winner: winners.includes(uid),
        score,
      };
    });

    const res = await fetch(playId ? `/api/plays/${playId}` : "/api/plays", {
      method: playId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        played_at: datetimeLocalToIso(playedAt),
        duration_minutes: duration ? parseInt(duration, 10) : null,
        notes: notes.trim() || null,
        first_time_played: firstTimePlayed,
        participants: participantPayload,
        expansion_ids: selectedExpansions,
      }),
    });

    const data = await parseJsonResponse<{ id?: string; error?: string }>(res);

    if (!res.ok) {
      setError(data.error ?? "Failed to log play");
      setLoading(false);
      return;
    }

    router.push("/plays");
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Link
        href="/plays"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Play history
      </Link>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Game *</label>
        <GameSelect
          games={playableGames}
          value={gameId}
          onChange={handleGameChange}
          required
        />
      </div>

      {availableExpansions.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Expansions used
          </label>
          <div className="flex flex-wrap gap-2">
            {availableExpansions.map((exp) => (
              <button
                key={exp.id}
                type="button"
                onClick={() => toggleExpansion(exp.id)}
                className={`rounded-full px-3 py-1.5 text-sm border text-left ${
                  selectedExpansions.includes(exp.id)
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {exp.title}
                {exp.owner_names.length > 0 && (
                  <span className="block text-[10px] opacity-75">
                    {exp.owner_names.join(", ")}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">When</label>
        <input
          type="datetime-local"
          value={playedAt}
          onChange={(e) => setPlayedAt(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">
          Duration (minutes)
        </label>
        <input
          type="number"
          min={1}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          className={inputClass}
          placeholder="90"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Players</label>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => (
            <button
              key={m.user_id}
              type="button"
              onClick={() => toggleParticipant(m.user_id)}
              className={`rounded-full px-3 py-1.5 text-sm border ${
                participants.includes(m.user_id)
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-surface-2 text-muted"
              }`}
            >
              {m.profile.display_name}
            </button>
          ))}
        </div>
      </div>

      {participants.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <Trophy className="inline h-4 w-4 mr-1 text-amber-400" />
            Winner(s)
          </label>
          <p className="text-xs text-muted mb-2">
            Tap players who won (optional — supports ties)
          </p>
          <div className="flex flex-wrap gap-2">
            {members
              .filter((m) => participants.includes(m.user_id))
              .map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleWinner(m.user_id)}
                  className={`rounded-full px-3 py-1.5 text-sm border ${
                    winners.includes(m.user_id)
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                      : "border-border bg-surface-2 text-muted"
                  }`}
                >
                  {m.profile.display_name}
                </button>
              ))}
          </div>
        </div>
      )}

      {participants.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Scores (optional)
          </label>
          <div className="space-y-2">
            {members
              .filter((m) => participants.includes(m.user_id))
              .map((m) => (
                <div key={m.user_id} className="flex items-center gap-2">
                  <span className="text-sm w-28 truncate shrink-0">
                    {m.profile.display_name}
                  </span>
                  <input
                    type="number"
                    value={scores[m.user_id] ?? ""}
                    onChange={(e) =>
                      setScores((s) => ({ ...s, [m.user_id]: e.target.value }))
                    }
                    className={inputClass}
                    placeholder="Points"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={firstTimePlayed}
          onChange={(e) => setFirstTimePlayed(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm">First time our group played this game</span>
      </label>

      <div>
        <label className="block text-sm font-medium mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="House rules, memorable moments..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl bg-primary py-3 font-medium text-primary-fg disabled:opacity-50"
      >
        {loading ? "Saving..." : submitLabel ?? (playId ? "Save changes" : "Log play")}
      </button>
    </form>
  );
}
