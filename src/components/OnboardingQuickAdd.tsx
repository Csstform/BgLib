"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BggSearch } from "@/components/BggSearch";

type BggDetails = {
  id: number;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  imageUrl: string | null;
  bggType?: "boardgame" | "boardgameexpansion";
  baseGameBggId?: number | null;
};

export function OnboardingQuickAdd({
  userId,
  groupId,
}: {
  userId: string;
  groupId: string;
}) {
  const [added, setAdded] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");

  async function insertGame(fields: {
    title: string;
    description?: string | null;
    min_players?: number;
    max_players?: number | null;
    play_time_minutes?: number | null;
    image_url?: string | null;
    bgg_id?: number | null;
    bgg_type?: "boardgame" | "boardgameexpansion";
  }) {
    if (!groupId) {
      setError("Create or join a group first");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        title: fields.title.trim(),
        description: fields.description?.trim() || null,
        min_players: fields.min_players || 1,
        max_players: fields.max_players ?? null,
        play_time_minutes: fields.play_time_minutes ?? null,
        image_url: fields.image_url ?? null,
        bgg_id: fields.bgg_id ?? null,
        bgg_type: fields.bgg_type ?? "boardgame",
        created_by: userId,
        group_id: groupId,
      })
      .select("id, title")
      .single();

    if (gameError || !game) {
      setError(gameError?.message ?? "Failed to add game");
      setLoading(false);
      return;
    }

    await supabase.from("ownership").insert({
      user_id: userId,
      game_id: game.id,
    });

    setAdded((prev) => [...prev, game.title]);
    setManualTitle("");
    setLoading(false);
  }

  async function handleSelect(details: BggDetails) {
    await insertGame({
      title: details.name,
      description: details.description,
      min_players: details.minPlayers || 1,
      max_players: details.maxPlayers,
      play_time_minutes: details.playTimeMinutes,
      image_url: details.imageUrl,
      bgg_id: details.id,
      bgg_type: details.bggType ?? "boardgame",
    });
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim()) {
      setError("Enter a game title");
      return;
    }
    await insertGame({ title: manualTitle });
  }

  return (
    <div className="space-y-4 text-left">
      <BggSearch onSelect={handleSelect} />

      {manualOpen ? (
        <form onSubmit={handleManual} className="space-y-2">
          <label className="block text-sm font-medium">Add by title</label>
          <div className="flex gap-2">
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Game title"
              className="input-field"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="text-sm text-primary hover:underline"
        >
          Can&apos;t find it? Add by title
        </button>
      )}

      {loading && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Adding to your library...
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {added.length > 0 && (
        <ul className="space-y-1">
          {added.map((title) => (
            <li
              key={title}
              className="flex items-center gap-2 text-sm text-green-400"
            >
              <Check className="h-4 w-4 shrink-0" />
              <span className="truncate">{title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
