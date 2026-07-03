"use client";

import { useState } from "react";
import { ScanBarcode, Loader2, Search } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { BggSearchResult, GameUpcCandidate } from "@/lib/types";

type LookupResponse = {
  upc: string;
  bggId?: number;
  name?: string;
  productName?: string;
  found?: boolean;
  needsManualSearch?: boolean;
  source?: string;
  candidates?: GameUpcCandidate[];
  duplicate?: { id: string; title: string; bgg_id: number | null };
  error?: string;
  message?: string;
};

type Props = {
  onBggId: (bggId: number, upc: string) => Promise<void>;
  disabled?: boolean;
};

export function BarcodeLookupPanel({ onBggId, disabled }: Props) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [candidates, setCandidates] = useState<GameUpcCandidate[]>([]);
  const [pendingUpc, setPendingUpc] = useState("");
  const [manualSearch, setManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BggSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  async function saveMapping(upc: string, bggId: number, title?: string) {
    await fetch("/api/barcode/map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upc, bggId, title }),
    });
  }

  async function selectBggGame(bggId: number, upc: string, title?: string) {
    await saveMapping(upc, bggId, title);
    await onBggId(bggId, upc);
    setCandidates([]);
    setManualSearch(false);
    setSearchResults([]);
    setSearchQuery("");
    setHint("");
  }

  async function lookupUpc(upc: string) {
    setScannerOpen(false);
    setLoading(true);
    setError("");
    setHint("");
    setCandidates([]);
    setManualSearch(false);
    setSearchResults([]);
    setPendingUpc(upc);

    try {
      const res = await fetch(`/api/barcode/lookup?upc=${encodeURIComponent(upc)}`);
      const data = await parseJsonResponse<LookupResponse>(res);

      if (!res.ok) {
        throw new Error(data.error ?? data.message ?? "Lookup failed");
      }

      if (data.duplicate) {
        setError(
          `"${data.duplicate.title}" is already in your library (scanned UPC ${upc}).`
        );
        return;
      }

      if (data.bggId) {
        await selectBggGame(data.bggId, upc, data.name);
        return;
      }

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
        setHint(
          data.message ??
            (data.productName
              ? `Box label: "${data.productName}" — pick the matching game:`
              : "Pick the matching game:")
        );
        return;
      }

      if (data.needsManualSearch) {
        setManualSearch(true);
        setSearchQuery(data.productName ?? "");
        setHint(
          data.message ??
            "Search BGG to link this barcode. We'll remember it for next time."
        );
        return;
      }

      setError(data.message ?? "No game found for this barcode.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function chooseCandidate(candidate: GameUpcCandidate) {
    setLoading(true);
    setError("");
    try {
      await selectBggGame(candidate.bggId, pendingUpc, candidate.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setLoading(false);
    }
  }

  async function runManualSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        `/api/bgg/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const data = await parseJsonResponse<BggSearchResult[] | { error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "Search failed");
      }
      setSearchResults(data as BggSearchResult[]);
      if ((data as BggSearchResult[]).length === 0) {
        setError("No BGG results. Try a different search term.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setScannerOpen(true)}
        disabled={disabled || loading}
        className="pressable w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/15 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Looking up barcode...
          </>
        ) : (
          <>
            <ScanBarcode className="h-4 w-4" />
            Scan barcode
          </>
        )}
      </button>

      <p className="text-[11px] text-muted text-center">
        Uses your group&apos;s saved barcodes + BGG search. No GameUPC account needed.
      </p>

      {hint && !error && (
        <p className="text-xs text-primary/90">{hint}</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {candidates.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <p className="text-sm font-medium">Pick a game:</p>
          <ul className="space-y-1">
            {candidates.map((c) => (
              <li key={c.bggId}>
                <button
                  type="button"
                  onClick={() => chooseCandidate(c)}
                  disabled={loading}
                  className="pressable w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                >
                  {c.name ?? `BGG #${c.bggId}`}
                  {c.status ? (
                    <span className="text-muted ml-1 text-xs">({c.status})</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {manualSearch && pendingUpc && (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
          <p className="text-sm font-medium">Search BGG</p>
          <form onSubmit={runManualSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm"
                placeholder="Game title..."
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="shrink-0 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg disabled:opacity-50"
            >
              {searching ? "..." : "Search"}
            </button>
          </form>
          {searchResults.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() =>
                      selectBggGame(
                        r.id,
                        pendingUpc,
                        r.yearPublished
                          ? `${r.name} (${r.yearPublished})`
                          : r.name
                      )
                    }
                    disabled={loading}
                    className="pressable w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-50"
                  >
                    {r.name}
                    {r.yearPublished ? (
                      <span className="text-muted ml-1">({r.yearPublished})</span>
                    ) : null}
                    {r.type === "boardgameexpansion" && (
                      <span className="ml-1 text-[10px] uppercase text-amber-400">
                        Expansion
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={lookupUpc}
      />
    </div>
  );
}
