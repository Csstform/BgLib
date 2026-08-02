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

  async function handleSelect(details: BggDetails) {
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
        title: details.name.trim(),
        description: details.description.trim() || null,
        min_players: details.minPlayers || 1,
        max_players: details.maxPlayers,
        play_time_minutes: details.playTimeMinutes,
        image_url: details.imageUrl,
        bgg_id: details.id,
        bgg_type: details.bggType ?? "boardgame",
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
    setLoading(false);
  }

  return (
    <div className="space-y-4 text-left">
      <BggSearch onSelect={handleSelect} />

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
