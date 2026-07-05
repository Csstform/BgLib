"use client";

import { Download } from "lucide-react";
import { playsToCsv } from "@/lib/play-stats";

export function StatsExportButton({
  rows,
}: {
  rows: {
    played_at: string;
    title: string;
    winner_names: string[];
    participant_count: number;
  }[];
}) {
  if (rows.length === 0) return null;

  function exportCsv() {
    const csv = playsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bglib-plays-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground"
    >
      <Download className="h-3.5 w-3.5" />
      Export CSV
    </button>
  );
}
