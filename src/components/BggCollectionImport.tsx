"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, CheckCircle2 } from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";

const BATCH_SIZE = 8;

type PreviewResponse = {
  total: number;
  toImport: { id: number; name: string; subtype: string }[];
  skipped: { id: number; name: string; reason: "bgg_id" | "title" }[];
  skippedByBggId: number;
  skippedByTitle: number;
  linkedFromPreview: number;
  error?: string;
};

type BatchResponse = {
  imported: number;
  linked: number;
  skipped: number;
  failed: number;
  error?: string;
};

type ImportPhase = "idle" | "previewing" | "importing" | "done";

export function BggCollectionImport() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{
    imported: number;
    linked: number;
    linkedFromPreview: number;
    skippedPreview: number;
    skippedByBggId: number;
    skippedByTitle: number;
    failed: number;
    total: number;
  } | null>(null);

  async function startImport() {
    if (!username.trim()) return;

    setPhase("previewing");
    setError("");
    setSummary(null);
    setProgress({ done: 0, total: 0 });

    const previewRes = await fetch("/api/bgg/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "preview", username: username.trim() }),
    });

    const preview = await parseJsonResponse<PreviewResponse>(previewRes);
    if (!previewRes.ok) {
      setError(preview.error ?? "Failed to load BGG collection");
      setPhase("idle");
      return;
    }

    if (preview.total === 0) {
      setSummary({
        imported: 0,
        linked: 0,
        linkedFromPreview: 0,
        skippedPreview: 0,
        skippedByBggId: 0,
        skippedByTitle: 0,
        failed: 0,
        total: 0,
      });
      setPhase("done");
      return;
    }

    const idsToImport = preview.toImport.map((item) => item.id);
    setProgress({ done: 0, total: idsToImport.length });

    if (idsToImport.length === 0) {
      setSummary({
        imported: 0,
        linked: 0,
        linkedFromPreview: preview.linkedFromPreview,
        skippedPreview: preview.skipped.length,
        skippedByBggId: preview.skippedByBggId,
        skippedByTitle: preview.skippedByTitle,
        failed: 0,
        total: preview.total,
      });
      setPhase("done");
      router.refresh();
      return;
    }

    setPhase("importing");

    let imported = 0;
    let linked = 0;
    let failed = 0;

    for (let i = 0; i < idsToImport.length; i += BATCH_SIZE) {
      const batch = idsToImport.slice(i, i + BATCH_SIZE);
      const batchRes = await fetch("/api/bgg/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch", bggIds: batch }),
      });

      const batchData = await parseJsonResponse<BatchResponse>(batchRes);
      if (!batchRes.ok) {
        setError(batchData.error ?? "Import batch failed");
        setPhase("idle");
        return;
      }

      imported += batchData.imported;
      linked += batchData.linked;
      failed += batchData.failed;
      setProgress({ done: Math.min(i + batch.length, idsToImport.length), total: idsToImport.length });
    }

    await fetch("/api/games/relink-expansions", { method: "POST" });

    setSummary({
      imported,
      linked,
      linkedFromPreview: preview.linkedFromPreview,
      skippedPreview: preview.skipped.length,
      skippedByBggId: preview.skippedByBggId,
      skippedByTitle: preview.skippedByTitle,
      failed,
      total: preview.total,
    });
    setPhase("done");
    router.refresh();
  }

  const progressPercent =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const busy = phase === "previewing" || phase === "importing";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Download className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">Import BGG collection</p>
      </div>
      <p className="text-xs text-muted mb-3">
        Import your owned games from BoardGameGeek. Games already in your group
        library (by BGG ID or title) are skipped and linked to your collection
        instead.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="BGG username"
          disabled={busy}
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          type="button"
          onClick={startImport}
          disabled={busy || !username.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-50 flex items-center gap-1"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
        </button>
      </div>

      {phase === "previewing" && (
        <p className="mt-3 text-xs text-muted">Loading your BGG collection...</p>
      )}

      {phase === "importing" && progress.total > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Importing {progress.done} of {progress.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      {summary && phase === "done" && (
        <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Import complete
          </div>
          <ul className="mt-2 space-y-1 text-green-300/90">
            {summary.total === 0 ? (
              <li>No owned games found on that BGG account.</li>
            ) : (
              <>
                {summary.imported > 0 && (
                  <li>
                    {summary.imported} new game
                    {summary.imported !== 1 ? "s" : ""} added to the library
                  </li>
                )}
                {(summary.linked > 0 || summary.linkedFromPreview > 0) && (
                  <li>
                    {summary.linked + summary.linkedFromPreview} existing game
                    {summary.linked + summary.linkedFromPreview !== 1
                      ? "s"
                      : ""}{" "}
                    linked to your collection
                  </li>
                )}
                {summary.skippedPreview > 0 && (
                  <li>
                    {summary.skippedPreview} skipped as duplicates
                    {summary.skippedByBggId > 0 || summary.skippedByTitle > 0
                      ? ` (${[
                          summary.skippedByBggId > 0
                            ? `${summary.skippedByBggId} by BGG ID`
                            : null,
                          summary.skippedByTitle > 0
                            ? `${summary.skippedByTitle} by title`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(", ")})`
                      : ""}
                  </li>
                )}
                {summary.failed > 0 && (
                  <li className="text-amber-300">
                    {summary.failed} could not be imported from BGG
                  </li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
