"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BggSearch } from "@/components/BggSearch";
import { DuplicateWarning } from "@/components/DuplicateWarning";
import { HandCoins, Puzzle } from "lucide-react";
import { resolveBaseGameId } from "@/lib/resolve-base-game";

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

export function AddGameForm({
  userId,
  groupId,
  baseGameId,
  baseGameTitle,
}: {
  userId: string;
  groupId: string;
  baseGameId?: string;
  baseGameTitle?: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minPlayers, setMinPlayers] = useState("1");
  const [maxPlayers, setMaxPlayers] = useState("");
  const [playTime, setPlayTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [bggId, setBggId] = useState<number | null>(null);
  const [bggType, setBggType] = useState<"boardgame" | "boardgameexpansion" | null>(
    baseGameId ? "boardgameexpansion" : null
  );
  const [resolvedBaseGameId, setResolvedBaseGameId] = useState<string | null>(
    baseGameId ?? null
  );
  const [addToCollection, setAddToCollection] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleBggSelect(details: BggDetails) {
    setTitle(details.name);
    setDescription(details.description);
    setMinPlayers(String(details.minPlayers));
    setMaxPlayers(details.maxPlayers ? String(details.maxPlayers) : "");
    setPlayTime(details.playTimeMinutes ? String(details.playTimeMinutes) : "");
    setImageUrl(details.imageUrl ?? "");
    setBggId(details.id);
    setBggType(details.bggType ?? "boardgame");

    if (baseGameId) {
      setResolvedBaseGameId(baseGameId);
      return;
    }

    if (details.bggType === "boardgameexpansion" && details.baseGameBggId) {
      const supabase = createClient();
      const localBaseId = await resolveBaseGameId(
        supabase,
        groupId,
        details.baseGameBggId
      );
      setResolvedBaseGameId(localBaseId);
    } else {
      setResolvedBaseGameId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    let linkedBaseId = resolvedBaseGameId;

    if (
      !linkedBaseId &&
      bggType === "boardgameexpansion" &&
      bggId
    ) {
      const detailsRes = await fetch(`/api/bgg/thing?id=${bggId}`);
      if (detailsRes.ok) {
        const details = (await detailsRes.json()) as BggDetails;
        linkedBaseId = await resolveBaseGameId(
          supabase,
          groupId,
          details.baseGameBggId
        );
      }
    }

    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        min_players: parseInt(minPlayers) || 1,
        max_players: maxPlayers ? parseInt(maxPlayers) : null,
        play_time_minutes: playTime ? parseInt(playTime) : null,
        image_url: imageUrl.trim() || null,
        bgg_id: bggId,
        bgg_type: bggType ?? (baseGameId ? "boardgameexpansion" : "boardgame"),
        base_game_id: linkedBaseId,
        created_by: userId,
        group_id: groupId,
      })
      .select()
      .single();

    if (gameError) {
      setError(gameError.message);
      setLoading(false);
      return;
    }

    if (addToCollection && game) {
      await supabase.from("ownership").insert({
        user_id: userId,
        game_id: game.id,
      });
    }

    router.push(`/library/${game!.id}`);
    router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  const isExpansion =
    !!baseGameId || bggType === "boardgameexpansion" || !!resolvedBaseGameId;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {baseGameTitle && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Puzzle className="h-4 w-4 text-primary" />
            Adding expansion for {baseGameTitle}
          </p>
        </div>
      )}

      <BggSearch onSelect={handleBggSelect} />

      <DuplicateWarning title={title} bggId={bggId} />

      {bggId && (
        <p className="text-xs text-muted flex items-center gap-1">
          <HandCoins className="h-3 w-3" />
          Imported from BoardGameGeek (ID: {bggId})
          {isExpansion ? " · Expansion" : ""}
        </p>
      )}

      {isExpansion && !resolvedBaseGameId && !baseGameId && (
        <p className="text-xs text-amber-400">
          Base game not in library yet — expansion will be listed separately until
          the base game is added.
        </p>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder={baseGameTitle ? "Cities & Knights" : "Catan"}
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1.5">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Trade, build, and settle the island of Catan..."
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="minPlayers" className="block text-sm font-medium mb-1.5">
            Min players
          </label>
          <input
            id="minPlayers"
            type="number"
            min="1"
            value={minPlayers}
            onChange={(e) => setMinPlayers(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium mb-1.5">
            Max players
          </label>
          <input
            id="maxPlayers"
            type="number"
            min="1"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(e.target.value)}
            className={inputClass}
            placeholder="4"
          />
        </div>
        <div>
          <label htmlFor="playTime" className="block text-sm font-medium mb-1.5">
            Play time (min)
          </label>
          <input
            id="playTime"
            type="number"
            min="1"
            value={playTime}
            onChange={(e) => setPlayTime(e.target.value)}
            className={inputClass}
            placeholder="60"
          />
        </div>
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium mb-1.5">
          Cover image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={inputClass}
          placeholder="https://..."
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={addToCollection}
          onChange={(e) => setAddToCollection(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm">Add to my collection</span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
      >
        {loading
          ? "Adding..."
          : isExpansion
            ? "Add expansion"
            : "Add to library"}
      </button>
    </form>
  );
}
