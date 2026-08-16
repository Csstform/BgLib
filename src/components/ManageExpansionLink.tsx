"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Link2, Unlink } from "lucide-react";
import { GameSelect } from "@/components/GameSelect";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Game } from "@/lib/types";

export function ManageExpansionLink({
  expansionId,
  expansionTitle,
  baseGameId,
  baseGameTitle,
  baseGames,
}: {
  expansionId: string;
  expansionTitle: string;
  baseGameId: string | null;
  baseGameTitle: string | null;
  baseGames: Pick<Game, "id" | "title">[];
}) {
  const router = useRouter();
  const [baseGameIdDraft, setBaseGameIdDraft] = useState(baseGameId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  async function updateLink(nextBaseGameId: string | null) {
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch(`/api/games/${expansionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base_game_id: nextBaseGameId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to update expansion link");
      setLoading(false);
      return;
    }

    setSuccess(
      nextBaseGameId === null
        ? "Expansion unlinked."
        : "Expansion link updated."
    );
    setLoading(false);
    setConfirmUnlink(false);
    router.refresh();
  }

  async function handleRelink(e: React.FormEvent) {
    e.preventDefault();
    if (!baseGameIdDraft) return;
    await updateLink(baseGameIdDraft);
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-amber-200">Expansion link</p>
          {baseGameId && baseGameTitle ? (
            <p className="mt-1 text-xs text-muted">
              Currently linked to{" "}
              <Link
                href={`/library/${baseGameId}`}
                className="text-primary hover:underline"
              >
                {baseGameTitle}
              </Link>
              .
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Not linked to a base game.{" "}
              <Link
                href={`/library/link-expansions?focus=${expansionId}`}
                className="text-primary hover:underline"
              >
                Open link-expansions page
              </Link>
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleRelink} className="space-y-2">
        <label className="block text-xs font-medium text-muted">
          {baseGameId ? "Change base game" : "Link to base game"}
        </label>
        <GameSelect
          games={baseGames as Game[]}
          value={baseGameIdDraft}
          onChange={setBaseGameIdDraft}
          required
          placeholder="Search base games..."
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {success && <p className="text-xs text-green-400">{success}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || !baseGameIdDraft || baseGameIdDraft === baseGameId}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {loading ? "Saving..." : baseGameId ? "Update link" : "Link expansion"}
          </button>
          {baseGameId && (
            <button
              type="button"
              onClick={() => setConfirmUnlink(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
            >
              <Unlink className="h-3.5 w-3.5" />
              Unlink
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmUnlink}
        title="Unlink expansion?"
        description={`Remove the link between "${expansionTitle}" and "${baseGameTitle}"? The expansion will appear separately in your library until you link it again.`}
        confirmLabel="Unlink"
        variant="danger"
        loading={loading}
        onConfirm={() => updateLink(null)}
        onCancel={() => setConfirmUnlink(false)}
      />
    </div>
  );
}
