"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Library,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { parseJsonResponse } from "@/lib/parse-json-response";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Group } from "@/lib/types";

type CopyMode = "my_collection" | "full_catalogue";

type PreviewResponse = {
  source?: { id: string; name: string };
  target?: { id: string; name: string };
  total: number;
  extraBases: number;
  toCopy: { id: string; title: string }[];
  toLink: { id: string; title: string; reason?: string }[];
  error?: string;
};

type CopyResponse = {
  copied: number;
  linked: number;
  failed: number;
  error?: string;
};

export function CopyLibraryCard({
  activeGroupName,
  otherGroups,
}: {
  activeGroupName: string;
  otherGroups: Pick<Group, "id" | "name">[];
}) {
  const router = useRouter();
  const [sourceGroupId, setSourceGroupId] = useState(otherGroups[0]?.id ?? "");
  const [mode, setMode] = useState<CopyMode>("my_collection");
  const [phase, setPhase] = useState<"idle" | "previewing" | "ready" | "copying" | "done">(
    "idle"
  );
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<CopyResponse | null>(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (otherGroups.length === 0) return null;

  const sourceName =
    otherGroups.find((group) => group.id === sourceGroupId)?.name ?? "that group";

  async function loadPreview() {
    setError("");
    setResult(null);
    setPhase("previewing");

    try {
      const res = await fetch("/api/groups/copy-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          source_group_id: sourceGroupId,
          mode,
        }),
      });
      const data = await parseJsonResponse<PreviewResponse>(res);
      if (!res.ok) {
        setError(data.error ?? "Failed to preview library");
        setPhase("idle");
        return;
      }
      setPreview(data);
      setPhase("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview library");
      setPhase("idle");
    }
  }

  async function runCopy() {
    setConfirmOpen(false);
    setError("");
    setPhase("copying");

    try {
      const res = await fetch("/api/groups/copy-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy",
          source_group_id: sourceGroupId,
          mode,
        }),
      });
      const data = await parseJsonResponse<CopyResponse>(res);
      if (!res.ok) {
        setError(data.error ?? "Failed to copy library");
        setPhase(preview ? "ready" : "idle");
        return;
      }
      setResult(data);
      setPhase("done");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy library");
      setPhase(preview ? "ready" : "idle");
    }
  }

  const busy = phase === "previewing" || phase === "copying";

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <Library className="h-4 w-4 text-primary" />
        <p className="text-sm font-medium">Copy library from another group</p>
      </div>
      <p className="mb-3 text-xs text-muted">
        Bring games you already added into {activeGroupName} without reimporting
        from BoardGameGeek. Plays, loans, and game nights stay in the source
        group.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">
            Copy from
          </label>
          <select
            value={sourceGroupId}
            onChange={(e) => {
              setSourceGroupId(e.target.value);
              setPreview(null);
              setResult(null);
              setPhase("idle");
            }}
            disabled={busy}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm disabled:opacity-50"
          >
            {otherGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-xs font-medium text-muted">
            What to copy
          </legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="copy-mode"
              checked={mode === "my_collection"}
              onChange={() => {
                setMode("my_collection");
                setPreview(null);
                setResult(null);
                setPhase("idle");
              }}
              disabled={busy}
              className="mt-1 accent-primary"
            />
            <span>
              My collection
              <span className="mt-0.5 block text-xs text-muted">
                Games you own in {sourceName}, plus any needed base games so
                expansions stay linked.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="copy-mode"
              checked={mode === "full_catalogue"}
              onChange={() => {
                setMode("full_catalogue");
                setPreview(null);
                setResult(null);
                setPhase("idle");
              }}
              disabled={busy}
              className="mt-1 accent-primary"
            />
            <span>
              Entire group library
              <span className="mt-0.5 block text-xs text-muted">
                All catalogue games from {sourceName}. Only your own ownership
                is copied.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadPreview}
            disabled={busy || !sourceGroupId}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-2 disabled:opacity-50"
          >
            {phase === "previewing" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Preview
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={busy || !preview || preview.total === 0}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
          >
            {phase === "copying" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Copy into {activeGroupName}
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      {preview && phase !== "done" && (
        <div className="mt-3 rounded-lg border border-border bg-surface-2 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            {sourceName}
            <ArrowRight className="h-3.5 w-3.5 text-muted" />
            {activeGroupName}
          </p>
          {preview.total === 0 ? (
            <p className="mt-2 text-muted">
              Nothing to copy from that group with the selected option.
            </p>
          ) : (
            <ul className="mt-2 space-y-1 text-muted">
              <li>
                {preview.toCopy.length} new game
                {preview.toCopy.length !== 1 ? "s" : ""} will be added
              </li>
              <li>
                {preview.toLink.length} already in {activeGroupName} and will be
                linked to your collection
              </li>
              {preview.extraBases > 0 && (
                <li>
                  Includes {preview.extraBases} base game
                  {preview.extraBases !== 1 ? "s" : ""} so expansions stay
                  nested
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {result && phase === "done" && (
        <div className="mt-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Library copied
          </div>
          <ul className="mt-2 space-y-1 text-green-300/90">
            {result.copied > 0 && (
              <li>
                {result.copied} game{result.copied !== 1 ? "s" : ""} added to{" "}
                {activeGroupName}
              </li>
            )}
            {result.linked > 0 && (
              <li>
                {result.linked} existing game
                {result.linked !== 1 ? "s" : ""} linked to your collection
              </li>
            )}
            {result.failed > 0 && (
              <li className="text-amber-300">
                {result.failed} could not be copied
              </li>
            )}
            {result.copied === 0 && result.linked === 0 && result.failed === 0 && (
              <li>No games needed to be copied.</li>
            )}
          </ul>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`Copy games into ${activeGroupName}?`}
        description={
          preview
            ? `${preview.toCopy.length} new game${preview.toCopy.length !== 1 ? "s" : ""} from ${sourceName} will be added. ${preview.toLink.length} already exist and will be linked. Plays, loans, and game nights stay in ${sourceName}.`
            : "Copy selected games into the active group."
        }
        confirmLabel="Copy games"
        loading={phase === "copying"}
        onConfirm={runCopy}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
