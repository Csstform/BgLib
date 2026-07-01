"use client";

import { useState } from "react";
import { ScanBarcode, Loader2 } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { parseJsonResponse } from "@/lib/parse-json-response";
import type { GameUpcCandidate } from "@/lib/types";

type LookupResponse = {
  upc: string;
  bggId?: number;
  name?: string;
  found?: boolean;
  configured?: boolean;
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
  const [candidates, setCandidates] = useState<GameUpcCandidate[]>([]);
  const [pendingUpc, setPendingUpc] = useState("");

  async function lookupUpc(upc: string) {
    setScannerOpen(false);
    setLoading(true);
    setError("");
    setCandidates([]);
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
        await onBggId(data.bggId, upc);
        return;
      }

      if (data.candidates && data.candidates.length > 0) {
        setCandidates(data.candidates);
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
      await onBggId(candidate.bggId, pendingUpc);
      setCandidates([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setLoading(false);
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

      {error && <p className="text-xs text-red-400">{error}</p>}

      {candidates.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
          <p className="text-sm font-medium">Multiple matches — pick one:</p>
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

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={lookupUpc}
      />
    </div>
  );
}
