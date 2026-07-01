"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import type { BggSearchResult } from "@/lib/types";
import { parseJsonResponse } from "@/lib/parse-json-response";

type BggDetails = {
  id: number;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  imageUrl: string | null;
};

type Props = {
  onSelect: (details: BggDetails) => void;
};

export function BggSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BggSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingId, setFetchingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/bgg/search?q=${encodeURIComponent(q)}`);
      const data = await parseJsonResponse<BggSearchResult[] | { error?: string }>(res);
      if (!res.ok) {
        const err = data as { error?: string };
        throw new Error(err.error ?? "Search failed");
      }
      setResults(data as BggSearchResult[]);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function selectGame(result: BggSearchResult) {
    setFetchingId(result.id);
    setError("");
    try {
      const res = await fetch(`/api/bgg/thing?id=${result.id}`);
      const data = await parseJsonResponse<BggDetails & { error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to load game");
      onSelect(data);
      setQuery(data.name);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load game");
    } finally {
      setFetchingId(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1.5">
        Search BoardGameGeek
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted animate-spin" />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-10 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Search BGG to auto-fill details..."
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface shadow-lg max-h-60 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => selectGame(r)}
                disabled={fetchingId === r.id}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2 transition-colors flex items-center justify-between disabled:opacity-50"
              >
                <span>
                  {r.name}
                  {r.yearPublished ? (
                    <span className="text-muted ml-1">({r.yearPublished})</span>
                  ) : null}
                </span>
                {fetchingId === r.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
