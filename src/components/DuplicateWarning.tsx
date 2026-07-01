"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { DuplicateMatch } from "@/lib/types";

export function DuplicateWarning({
  title,
  bggId,
  upc,
}: {
  title: string;
  bggId: number | null;
  upc?: string | null;
}) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);

  const check = useCallback(async () => {
    if (!title.trim() && !bggId && !upc) {
      setDuplicates([]);
      return;
    }
    const params = new URLSearchParams();
    if (bggId) params.set("bgg_id", String(bggId));
    if (upc) params.set("upc", upc);
    if (title.trim().length >= 3) params.set("title", title.trim());

    const res = await fetch(`/api/games/check-duplicate?${params}`);
    const data = await res.json();
    setDuplicates(data.duplicates ?? []);
  }, [title, bggId, upc]);

  useEffect(() => {
    const t = setTimeout(check, 400);
    return () => clearTimeout(t);
  }, [check]);

  if (duplicates.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-200">
            Possible duplicate{duplicates.length > 1 ? "s" : ""} in your group
          </p>
          <ul className="mt-1 space-y-1">
            {duplicates.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/library/${d.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {d.title}
                  {d.match_type === "bgg_id"
                    ? " (same BGG ID)"
                    : d.match_type === "upc"
                      ? " (same barcode)"
                      : " (same title)"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
