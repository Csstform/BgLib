"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trophy, X } from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { Game, Profile } from "@/lib/types";
import { GameSelect } from "@/components/GameSelect";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/utils";
import { profileName } from "@/lib/profile-name";
import { guestParticipantKey } from "@/lib/play-participant";

type Member = { user_id: string; profile: Profile };

type ExpansionOption = {
  id: string;
  title: string;
  owner_names: string[];
};

function parseScore(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const parsed = parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LogPlayForm({
  games,
  expansionsByBase,
  members,
  userId,
  preselectedGameId,
  preselectedExpansionId,
  playId,
  submitLabel,
  sourceNightTitle,
  initialPlayedAt,
  initialDuration,
  initialNotes,
  initialParticipants,
  initialGuests,
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
  sourceNightTitle?: string;
  initialPlayedAt?: string;
  initialDuration?: string;
  initialNotes?: string;
  initialParticipants?: string[];
  initialGuests?: string[];
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
  const [guests, setGuests] = useState<string[]>(initialGuests ?? []);
  const [guestDraft, setGuestDraft] = useState("");
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

  const scoredPlayers = useMemo(
    () => [
      ...members
        .filter((m) => participants.includes(m.user_id))
        .map((m) => ({
          key: m.user_id,
          label: profileName(m.profile),
        })),
      ...guests.map((name) => ({
        key: guestParticipantKey(name),
        label: name,
      })),
    ],
    [guests, members, participants]
  );

  function handleGameChange(nextGameId: string) {
    setGameId(nextGameId);
    setSelectedExpansions([]);
  }

  function clearPlayerExtras(id: string) {
    setWinners((w) => w.filter((x) => x !== id));
    setScores((s) => {
      const copy = { ...s };
      delete copy[id];
      return copy;
    });
  }

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (!next.includes(id)) clearPlayerExtras(id);
      return next;
    });
  }

  function addGuest() {
    const name = guestDraft.trim();
    if (!name) return;
    const exists = guests.some((g) => g.toLowerCase() === name.toLowerCase());
    if (exists) {
      setGuestDraft("");
      return;
    }
    setGuests((prev) => [...prev, name]);
    setGuestDraft("");
  }

  function removeGuest(name: string) {
    setGuests((prev) => prev.filter((g) => g !== name));
    clearPlayerExtras(guestParticipantKey(name));
  }

  function toggleWinner(id: string) {
    if (!scoredPlayers.some((p) => p.key === id)) return;
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

    const memberPayload = participants.map((uid) => ({
      user_id: uid,
      is_winner: winners.includes(uid),
      score: parseScore(scores[uid]),
    }));
    const guestPayload = guests.map((name) => {
      const key = guestParticipantKey(name);
      return {
        guest_name: name,
        is_winner: winners.includes(key),
        score: parseScore(scores[key]),
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
        participants: [...memberPayload, ...guestPayload],
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

      {sourceNightTitle && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          Prefilling from{" "}
          <span className="font-medium text-foreground">{sourceNightTitle}</span>
          . Date and Going attendees are filled in — add guests if anyone
          played without an account.
        </div>
      )}

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
              {profileName(m.profile)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Guest players</label>
        <p className="mb-2 text-xs text-muted">
          Add people who played without a BgLib account
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={guestDraft}
            onChange={(e) => setGuestDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addGuest();
              }
            }}
            className={inputClass}
            placeholder="Guest name"
          />
          <button
            type="button"
            onClick={addGuest}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border px-3 py-2.5 text-sm font-medium hover:bg-surface-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        {guests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {guests.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => removeGuest(name)}
                className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary/20 px-3 py-1.5 text-sm text-primary"
              >
                {name}
                <X className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {scoredPlayers.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            <Trophy className="inline h-4 w-4 mr-1 text-amber-400" />
            Winner(s)
          </label>
          <p className="text-xs text-muted mb-2">
            Tap players who won (optional — supports ties)
          </p>
          <div className="flex flex-wrap gap-2">
            {scoredPlayers.map((player) => (
              <button
                key={player.key}
                type="button"
                onClick={() => toggleWinner(player.key)}
                className={`rounded-full px-3 py-1.5 text-sm border ${
                  winners.includes(player.key)
                    ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                    : "border-border bg-surface-2 text-muted"
                }`}
              >
                {player.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {scoredPlayers.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Scores (optional)
          </label>
          <div className="space-y-2">
            {scoredPlayers.map((player) => (
              <div key={player.key} className="flex items-center gap-2">
                <span className="text-sm w-28 truncate shrink-0">
                  {player.label}
                </span>
                <input
                  type="number"
                  value={scores[player.key] ?? ""}
                  onChange={(e) =>
                    setScores((s) => ({ ...s, [player.key]: e.target.value }))
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
