"use client";

import { useState, useMemo } from "react";
import { GameCard } from "@/components/GameCard";
import { SearchBar } from "@/components/SearchBar";
import type { GameWithOwners } from "@/lib/types";

export function LibraryClient({ games }: { games: GameWithOwners[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.owners?.some((o) => o.display_name.toLowerCase().includes(q))
    );
  }, [games, search]);

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} />
      {filtered.length === 0 ? (
        <p className="text-center text-muted py-8">
          {search ? "No games match your search." : "No games in the library yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
}
