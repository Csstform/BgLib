"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Game } from "@/lib/types";

type Props = {
  games: Game[];
};

export function CreateGameNightForm({ games }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [location, setLocation] = useState("");
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleGame(id: string) {
    setSelectedGames((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/game-nights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          scheduled_at: new Date(scheduledAt).toISOString(),
          location,
          game_ids: selectedGames,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");

      router.push(`/game-nights/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Link
        href="/game-nights"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to game nights
      </Link>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1.5">
          Title <span className="text-red-400">*</span>
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className={inputClass}
          placeholder="Friday Game Night"
        />
      </div>

      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium mb-1.5">
          Date & time <span className="text-red-400">*</span>
        </label>
        <input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium mb-1.5">
          Location
        </label>
        <input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={inputClass}
          placeholder="My place, 123 Main St"
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
          placeholder="Bring snacks! We'll decide what to play..."
        />
      </div>

      {games.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Games to play (optional)</p>
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
            {games.map((g) => (
              <label
                key={g.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedGames.includes(g.id)}
                  onChange={() => toggleGame(g.id)}
                  className="accent-primary"
                />
                <span className="text-sm">{g.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Creating..." : "Plan game night"}
      </button>
    </form>
  );
}
