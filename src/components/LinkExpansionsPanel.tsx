"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, CheckCircle2 } from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";

export function LinkExpansionsPanel({
  orphanCount,
  autoRun = false,
}: {
  orphanCount: number;
  autoRun?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    linked: number;
    unresolved: number;
  } | null>(null);
  const [error, setError] = useState("");
  const autoStartedRef = useRef(false);

  async function linkExpansions() {
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
  }

  useEffect(() => {
    if (!autoRun || orphanCount === 0 || autoStartedRef.current) return;
    autoStartedRef.current = true;

    async function run() {
      setLoading(true);
      setError("");
      setResult(null);

      const res = await fetch("/api/games/relink-expansions", {
        method: "POST",
      });
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
    }

    run();
  }, [autoRun, orphanCount, router]);

  if (orphanCount === 0 && !result) return null;

  const remaining = result?.unresolved ?? orphanCount;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-200">
            Unlinked expansions
          </p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            {result
              ? result.linked > 0
                ? `Linked ${result.linked} expansion${result.linked !== 1 ? "s" : ""} to their base games.`
                : "No expansions could be auto-linked. The base game may not be in your library yet, or the expansion may be missing a BGG id."
              : `${orphanCount} expansion${orphanCount !== 1 ? "s" : ""} aren\u2019t attached to a base game in your library. We can match them using BoardGameGeek data when the base game is present.`}
          </p>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          {result && result.linked > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Expansions moved under their base games
            </p>
          )}

          {(!result || remaining > 0) && (
            <button
              type="button"
              onClick={linkExpansions}
              disabled={loading}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/20 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/30 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {loading ? "Linking..." : "Link expansions"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
