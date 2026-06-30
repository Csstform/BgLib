"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X, Check } from "lucide-react";
import type { Game } from "@/lib/types";

export function EditGameForm({ game }: { game: Game }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(game.title);
  const [description, setDescription] = useState(game.description ?? "");
  const [minPlayers, setMinPlayers] = useState(String(game.min_players));
  const [maxPlayers, setMaxPlayers] = useState(
    game.max_players ? String(game.max_players) : ""
  );
  const [playTime, setPlayTime] = useState(
    game.play_time_minutes ? String(game.play_time_minutes) : ""
  );
  const [imageUrl, setImageUrl] = useState(game.image_url ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/games/${game.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        min_players: parseInt(minPlayers) || 1,
        max_players: maxPlayers ? parseInt(maxPlayers) : null,
        play_time_minutes: playTime ? parseInt(playTime) : null,
        image_url: imageUrl,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to save");
    } else {
      setEditing(false);
      router.refresh();
    }
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
        Edit game details
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-medium text-sm">Edit game</p>
        <button type="button" onClick={() => setEditing(false)}>
          <X className="h-4 w-4 text-muted" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className={inputClass}
      />
      <div className="grid grid-cols-3 gap-2">
        <input type="number" value={minPlayers} onChange={(e) => setMinPlayers(e.target.value)} className={inputClass} placeholder="Min" />
        <input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className={inputClass} placeholder="Max" />
        <input type="number" value={playTime} onChange={(e) => setPlayTime(e.target.value)} className={inputClass} placeholder="Min" />
      </div>
      <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={inputClass} placeholder="Image URL" />
      <button
        type="button"
        onClick={save}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        {loading ? "Saving..." : "Save changes"}
      </button>
    </div>
  );
}
