"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { datetimeLocalToIso, toDatetimeLocalValue } from "@/lib/utils";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { Game } from "@/lib/types";

function defaultGameNightScheduledAt(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

function subscribe() {
  return () => {};
}

function useClientDatetimeLocal(iso?: string) {
  return useSyncExternalStore(
    subscribe,
    () => (iso ? toDatetimeLocalValue(iso) : defaultGameNightScheduledAt()),
    () => ""
  );
}

type ExistingNight = {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  location: string | null;
  game_ids: string[];
};

export function GameNightForm({
  games,
  night,
  emailConfigured = false,
}: {
  games: Game[];
  night?: ExistingNight;
  emailConfigured?: boolean;
}) {
  const router = useRouter();
  const isEdit = !!night;
  const [title, setTitle] = useState(night?.title ?? "");
  const [description, setDescription] = useState(night?.description ?? "");
  const clientScheduledAt = useClientDatetimeLocal(night?.scheduled_at);
  const [scheduledAtOverride, setScheduledAtOverride] = useState<string | null>(
    null
  );
  const scheduledAt = scheduledAtOverride ?? clientScheduledAt;
  const [location, setLocation] = useState(night?.location ?? "");
  const [selectedGames, setSelectedGames] = useState<string[]>(night?.game_ids ?? []);
  const [sendEmail, setSendEmail] = useState(true);
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
      const res = await fetch(
        isEdit ? `/api/game-nights/${night.id}` : "/api/game-nights",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            description,
            scheduled_at: datetimeLocalToIso(scheduledAt),
            location,
            game_ids: selectedGames,
            send_email: emailConfigured && sendEmail,
          }),
        }
      );

      const data = await parseJsonResponse<{ id?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to save");

      router.push(`/game-nights/${isEdit ? night.id : data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const backHref = isEdit ? `/game-nights/${night.id}` : "/game-nights";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {isEdit ? "Back to game night" : "Back to game nights"}
      </Link>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium">
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
        <label htmlFor="scheduledAt" className="mb-1.5 block text-sm font-medium">
          Date & time <span className="text-red-400">*</span>
        </label>
        <input
          id="scheduledAt"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAtOverride(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="location" className="mb-1.5 block text-sm font-medium">
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
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium">
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
          <p className="mb-2 text-sm font-medium">Games to play (optional)</p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {games.map((g) => (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2"
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

      <label
        className={`flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 ${
          emailConfigured ? "cursor-pointer" : "opacity-70"
        }`}
      >
        <input
          type="checkbox"
          checked={emailConfigured && sendEmail}
          onChange={(e) => setSendEmail(e.target.checked)}
          disabled={!emailConfigured}
          className="mt-1 accent-primary"
        />
        <span>
          <span className="block text-sm font-medium">
            {isEdit ? "Email the group about these changes" : "Email the group"}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {emailConfigured
              ? "Sends an invite with the time, place, and an .ics calendar file to members who have email notifications on."
              : "Email isn't configured on this server yet. Push notifications still go out."}
          </span>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full rounded-xl bg-primary py-3 font-medium text-primary-fg hover:bg-primary-hover disabled:opacity-50"
      >
        {loading
          ? isEdit
            ? "Saving..."
            : "Creating..."
          : isEdit
            ? "Save changes"
            : "Plan game night"}
      </button>
    </form>
  );
}
