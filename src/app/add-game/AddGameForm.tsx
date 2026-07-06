"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BggSearch } from "@/components/BggSearch";
import { BarcodeLookupPanel } from "@/components/BarcodeLookupPanel";
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
  const [upc, setUpc] = useState<string | null>(null);
  const [bggType, setBggType] = useState<"boardgame" | "boardgameexpansion" | null>(
    baseGameId ? "boardgameexpansion" : null
  );
  const [resolvedBaseGameId, setResolvedBaseGameId] = useState<string | null>(
    baseGameId ?? null
  );
  const [addToCollection, setAddToCollection] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function applyBggDetails(details: BggDetails, scannedUpc?: string | null) {
    setTitle(details.name);
    setDescription(details.description);
    setMinPlayers(String(details.minPlayers));
    setMaxPlayers(details.maxPlayers ? String(details.maxPlayers) : "");
    setPlayTime(details.playTimeMinutes ? String(details.playTimeMinutes) : "");
    setImageUrl(details.imageUrl ?? "");
    setBggId(details.id);
    setBggType(details.bggType ?? "boardgame");
    if (scannedUpc) setUpc(scannedUpc);

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

  async function handleBggSelect(details: BggDetails) {
    await applyBggDetails(details);
  }

  async function handleBarcodeBggId(bggIdFromScan: number, scannedUpc: string) {
    const res = await fetch(`/api/bgg/thing?id=${bggIdFromScan}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to load game from BGG");
    }
    await applyBggDetails(data as BggDetails, scannedUpc);
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
        upc: upc,
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

  const inputClass = "input-field";

  const isExpansion =
    !!baseGameId || bggType === "boardgameexpansion" || !!resolvedBaseGameId;

  const hasImportedData = !!(title || bggId || upc);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

      <details className="section-card group" open>
        <summary className="cursor-pointer list-none p-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm">Import from barcode or BGG</span>
          <p className="mt-0.5 text-xs font-normal text-muted">
            Scan a box or search BoardGameGeek to auto-fill
          </p>
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <BarcodeLookupPanel onBggId={handleBarcodeBggId} disabled={loading} />

          <div className="relative">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-border" />
            <p className="relative mx-auto w-fit bg-surface px-3 text-xs text-muted">
              or search BGG
            </p>
          </div>

          <BggSearch onSelect={handleBggSelect} />
        </div>
      </details>

      <details className="section-card group" open={hasImportedData}>
        <summary className="cursor-pointer list-none p-4 font-medium marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm">Game details</span>
          <p className="mt-0.5 text-xs font-normal text-muted">
            {hasImportedData ? title || "Review imported details" : "Or enter manually"}
          </p>
        </summary>
        <div className="space-y-4 border-t border-border p-4">
          <DuplicateWarning title={title} bggId={bggId} upc={upc} />

          {upc && (
            <p className="text-xs text-muted">Scanned UPC: {upc}</p>
          )}

          {bggId && (
            <p className="flex items-center gap-1 text-xs text-muted">
              <HandCoins className="h-3 w-3" />
              Imported from BoardGameGeek (ID: {bggId})
              {isExpansion ? " · Expansion" : ""}
            </p>
          )}

          {isExpansion && !resolvedBaseGameId && !baseGameId && (
            <p className="text-xs text-amber-400">
              Base game not in library yet — expansion will be listed separately
              until the base game is added.
            </p>
          )}

          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
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
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="minPlayers" className="mb-1.5 block text-sm font-medium">
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
              <label htmlFor="maxPlayers" className="mb-1.5 block text-sm font-medium">
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
              <label htmlFor="playTime" className="mb-1.5 block text-sm font-medium">
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
            <label htmlFor="imageUrl" className="mb-1.5 block text-sm font-medium">
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

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={addToCollection}
              onChange={(e) => setAddToCollection(e.target.checked)}
              className="h-5 w-5 rounded border-border accent-primary"
            />
            <span className="text-sm">Add to my collection</span>
          </label>
        </div>
      </details>

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
