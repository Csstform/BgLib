"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";
import type { Game, Profile } from "@/lib/types";

type Member = { user_id: string; profile: Profile };

export function LogPlayForm({
  groupId,
  games,
  members,
  userId,
  preselectedGameId,
}: {
  groupId: string;
  games: Game[];
  members: Member[];
  userId: string;
  preselectedGameId?: string;
}) {
  const router = useRouter();
  const [gameId, setGameId] = useState(preselectedGameId ?? "");
  const [playedAt, setPlayedAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [participants, setParticipants] = useState<string[]>([userId]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleParticipant(id: string) {
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gameId) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: play, error: playError } = await supabase
      .from("plays")
      .insert({
        group_id: groupId,
        game_id: gameId,
        played_at: new Date(playedAt).toISOString(),
        duration_minutes: duration ? parseInt(duration) : null,
        notes: notes.trim() || null,
        logged_by: userId,
      })
      .select()
      .single();

    if (playError) {
      setError(playError.message);
      setLoading(false);
      return;
    }

    if (participants.length > 0) {
      await supabase.from("play_participants").insert(
        participants.map((uid) => ({ play_id: play!.id, user_id: uid }))
      );
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
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          required
          className={inputClass}
        >
          <option value="">Select a game</option>
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

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

      <div>
        <label className="block text-sm font-medium mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Who won, expansions used..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl bg-primary py-3 font-medium text-primary-fg disabled:opacity-50"
      >
        {loading ? "Saving..." : "Log play"}
      </button>
    </form>
  );
}
