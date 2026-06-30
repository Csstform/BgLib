"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2 } from "lucide-react";

export function BggCollectionImport() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function importCollection() {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch("/api/bgg/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Import failed");
    } else {
      setResult(
        `Imported ${data.imported} game${data.imported !== 1 ? "s" : ""}, skipped ${data.skipped}${data.truncated ? " (first 100 only)" : ""}`
      );
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Download className="h-4 w-4 text-primary" />
        <p className="font-medium text-sm">Import BGG collection</p>
      </div>
      <p className="text-xs text-muted mb-3">
        Import your owned games from BoardGameGeek into this group
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="BGG username"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={importCollection}
          disabled={loading || !username.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      {result && <p className="text-xs text-green-400 mt-2">{result}</p>}
    </div>
  );
}
