"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Loader2, Shuffle } from "lucide-react";
import { pickRandomPlayer, type StartPlayer } from "@/lib/start-player";
import { getInitials } from "@/lib/utils";

const SPIN_MS = 1400;
const SPIN_INTERVAL_MS = 80;

export function StartPlayerRandomizer({
  players,
  title = "Who goes first?",
  description = "Pick who's at the table, then randomize the start player.",
}: {
  players: StartPlayer[];
  title?: string;
  description?: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    players.map((p) => p.id)
  );
  const [winner, setWinner] = useState<StartPlayer | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const selectedPlayers = players.filter((p) => selectedIds.includes(p.id));

  function togglePlayer(id: string) {
    if (spinning) return;
    setWinner(null);
    setHighlightId(null);
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function pickStartPlayer() {
    if (selectedPlayers.length === 0 || spinning) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSpinning(true);
    setWinner(null);

    const chosen = pickRandomPlayer(selectedPlayers);
    if (!chosen) {
      setSpinning(false);
      return;
    }

    let tick = 0;
    const totalTicks = Math.ceil(SPIN_MS / SPIN_INTERVAL_MS);

    intervalRef.current = setInterval(() => {
      const flash =
        selectedPlayers[tick % selectedPlayers.length] ?? selectedPlayers[0];
      setHighlightId(flash.id);
      tick += 1;
    }, SPIN_INTERVAL_MS);

    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setHighlightId(chosen.id);
      setWinner(chosen);
      setSpinning(false);
    }, SPIN_INTERVAL_MS * totalTicks);
  }

  if (players.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-400" />
          <h2 className="font-semibold text-sm">{title}</h2>
        </div>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {players.map((player) => {
          const isSelected = selectedIds.includes(player.id);
          const isHighlighted = highlightId === player.id;
          const isWinner = winner?.id === player.id;

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => togglePlayer(player.id)}
              disabled={spinning}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-70 ${
                isWinner
                  ? "border-amber-400 bg-amber-500/25 text-amber-100 ring-2 ring-amber-400/50"
                  : isHighlighted
                    ? "border-primary bg-primary/25 text-primary"
                    : isSelected
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                      : "border-border bg-surface-2 text-muted"
              }`}
            >
              <PlayerAvatar player={player} />
              <span>{player.name}</span>
              {isWinner && <Crown className="h-3.5 w-3.5 text-amber-300" />}
            </button>
          );
        })}
      </div>

      {winner && !spinning && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-amber-200/80">
            Start player
          </p>
          <p className="mt-1 text-lg font-bold text-amber-100">{winner.name}</p>
        </div>
      )}

      <button
        type="button"
        onClick={pickStartPlayer}
        disabled={spinning || selectedPlayers.length === 0}
        className="pressable flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/90 py-3 text-sm font-medium text-amber-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {spinning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Picking...
          </>
        ) : (
          <>
            <Shuffle className="h-4 w-4" />
            {winner ? "Pick again" : "Pick start player"}
          </>
        )}
      </button>
    </div>
  );
}

function PlayerAvatar({ player }: { player: StartPlayer }) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-500/20 text-[10px] font-medium text-amber-200">
      {player.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={player.avatar_url}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(player.name)
      )}
    </div>
  );
}
