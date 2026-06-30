"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HandCoins } from "lucide-react";

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

  async function requestLoan() {
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { error: loanError } = await supabase.from("loans").insert({
      game_id: gameId,
      lender_id: lenderId,
      borrower_id: currentUserId,
      status: "pending",
      due_date: dueDate || null,
      notes: notes.trim() || null,
    });

    if (loanError) {
      setError(loanError.message);
    } else {
      setShowForm(false);
      router.refresh();
    }
    setLoading(false);
  }

  if (hasActiveLoan) {
    return (
      <span className="text-xs text-muted">Loan pending or active</span>
    );
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
      >
        <HandCoins className="h-3.5 w-3.5" />
        Borrow
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-lg border border-border bg-surface-2 p-3 space-y-2">
      <p className="text-xs font-medium">Request to borrow from {lenderName}</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs"
        placeholder="Due date (optional)"
      />
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs"
        placeholder="Notes (optional)"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={requestLoan}
          disabled={loading}
          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-medium text-primary-fg disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send request"}
        </button>
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
