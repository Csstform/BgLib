"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Link2, Loader2, Puzzle } from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";
import { OrphanExpansionCard } from "@/components/OrphanExpansionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Game, GameWithOwners } from "@/lib/types";

export function LinkExpansionsPageClient({
  orphans,
  baseGames,
}: {
  orphans: GameWithOwners[];
  baseGames: Pick<Game, "id" | "title">[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const autoStartedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    linked: number;
    unresolved: number;
  } | null>(null);
  const [error, setError] = useState("");

  const linkExpansions = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/games/relink-expansions", { method: "POST" });
    const data = await parseJsonResponse<{
      linked?: number;
      unresolved?: number;
      error?: string;
    }>(res);

    if (!res.ok) {
      setError(data.error ?? "Could not link expansions");
      setLoading(false);
      return;
    }

    setResult({ linked: data.linked ?? 0, unresolved: data.unresolved ?? 0 });
    setLoading(false);
    if ((data.linked ?? 0) > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    if (orphans.length === 0 || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void linkExpansions();
  }, [orphans.length, linkExpansions]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`expansion-${focusId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focusId, orphans.length]);

  return (
    <div className="page-shell space-y-6">
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to library
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Link expansions</h1>
        <p className="mt-1 text-sm text-muted">
          Match expansions and DLCs to their base games in your library.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-200">Auto-link</p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              {loading
                ? "Checking BoardGameGeek for matching base games..."
                : result
                  ? result.linked > 0
                    ? `Linked ${result.linked} expansion${result.linked !== 1 ? "s" : ""} automatically.`
                    : "No additional expansions could be auto-linked. Link any remaining ones below."
                  : "Uses BGG data when the base game is already in your library."}
            </p>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            {result && result.linked > 0 && (
              <p className="mt-2 flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Auto-link complete
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={linkExpansions}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/30 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {loading ? "Linking..." : "Run auto-link again"}
        </button>
      </div>

      {orphans.length === 0 ? (
        <EmptyState
          icon={Puzzle}
          title="All expansions are linked"
          description="Every expansion in your library is attached to a base game."
          action={{ href: "/library", label: "Back to library" }}
        />
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Unlinked expansions ({orphans.length})
            </h2>
          </div>
          <p className="text-xs text-muted">
            These expansions and DLCs aren&apos;t attached to a base game yet.
            Search and link each one manually, or add the missing base game to
            your library and run auto-link.
          </p>
          <div className="space-y-2">
            {orphans.map((expansion) => (
              <OrphanExpansionCard
                key={expansion.id}
                expansion={expansion}
                baseGames={baseGames}
                defaultOpen={expansion.id === focusId}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
