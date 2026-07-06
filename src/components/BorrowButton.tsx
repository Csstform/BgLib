"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HandCoins, Loader2 } from "lucide-react";

type Props = {
  gameId: string;
  lenderId: string;
  lenderName: string;
  currentUserId: string;
  hasActiveLoan: boolean;
};

export function BorrowButton({
  gameId,
  lenderId,
  lenderName,
  currentUserId,
  hasActiveLoan,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (lenderId === currentUserId) return null;

  if (hasActiveLoan) {
    return (
      <span className="shrink-0 self-center text-xs text-muted">
        Loan pending
      </span>
    );
  }

  async function requestLoan() {
    setLoading(true);
    setError("");

    const res = await fetch("/api/loans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        game_id: gameId,
        lender_id: lenderId,
        due_date: dueDate || null,
        notes: notes.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Request failed");
    } else {
      setShowForm(false);
      router.refresh();
    }
    setLoading(false);
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="pressable touch-target flex shrink-0 items-center gap-1.5 self-center rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary"
      >
        <HandCoins className="h-4 w-4" />
        Borrow
      </button>
    );
  }

  return (
    <div className="w-full basis-full rounded-lg border border-border bg-surface-2 p-3 space-y-2">
      <p className="text-sm font-medium">Request to borrow from {lenderName}</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="input-field py-2 text-sm"
        aria-label="Due date (optional)"
      />
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="input-field py-2 text-sm"
        placeholder="Notes (optional)"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={requestLoan}
          disabled={loading}
          className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-fg disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Sending..." : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="touch-target rounded-lg px-4 py-2.5 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
