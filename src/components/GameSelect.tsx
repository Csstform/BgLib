"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import type { Game } from "@/lib/types";

type Props = {
  games: Game[];
  value: string;
  onChange: (gameId: string) => void;
  required?: boolean;
  placeholder?: string;
};

export function GameSelect({ games, value, onChange, required, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const playableGames = useMemo(
    () => games.filter((g) => !g.base_game_id),
    [games]
  );

  const selected = playableGames.find((g) => g.id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return playableGames.slice(0, 50);
    return playableGames
      .filter((g) => g.title.toLowerCase().includes(q))
      .slice(0, 50);
  }, [playableGames, query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectGame(game: Game) {
    onChange(game.id);
    setQuery(game.title);
    setOpen(false);
  }

  function toggleOpen() {
    setOpen((prev) => {
      if (!prev) setQuery(selected?.title ?? "");
      return !prev;
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <SearchBar
          value={open ? query : (selected?.title ?? query)}
          onChange={(next) => {
            setQuery(next);
            setOpen(true);
            if (!next.trim()) onChange("");
          }}
          placeholder={placeholder ?? "Search your library..."}
          className="pr-10"
        />
        <button
          type="button"
          onClick={toggleOpen}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-foreground"
          aria-label="Toggle game list"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {required && !value && (
        <input
          tabIndex={-1}
          className="sr-only"
          value=""
          required
          onChange={() => {}}
        />
      )}

      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-surface shadow-lg">
          {filtered.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">No games found</li>
          ) : (
            filtered.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => selectGame(game)}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-surface-2 ${
                    game.id === value ? "bg-primary/10 text-primary" : ""
                  }`}
                >
                  {game.title}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
