"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { formatDate, formatLoanStatus } from "@/lib/utils";
import type { LoanWithDetails } from "@/lib/types";
import { GameCover } from "./ui/GameCover";

export function LoanCard({
  loan,
  currentUserId,
}: {
  loan: LoanWithDetails;
  currentUserId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isLender = loan.lender_id === currentUserId;
  const isBorrower = loan.borrower_id === currentUserId;

  async function updateStatus(
    status: "active" | "returned" | "declined" | "cancelled"
  ) {
    setLoading(true);
    await fetch(`/api/loans/${loan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
    setLoading(false);
  }

  const statusColor: Record<string, string> = {
    pending: "text-amber-400",
    active: "text-blue-400",
    returned: "text-green-400",
    declined: "text-red-400",
    cancelled: "text-muted",
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex gap-3">
        <Link href={`/library/${loan.game.id}`} className="shrink-0">
          <GameCover
            src={loan.game.image_url}
            alt={loan.game.title}
            size="sm"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={`/library/${loan.game.id}`}
            className="block truncate font-semibold hover:text-primary"
          >
            {loan.game.title}
          </Link>
          <p className={`text-xs font-medium ${statusColor[loan.status]}`}>
            {formatLoanStatus(loan.status)}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {isLender ? "Borrower" : "Lender"}:{" "}
            <Link
              href={`/users/${isLender ? loan.borrower.id : loan.lender.id}`}
              className="hover:text-foreground"
            >
              {isLender
                ? loan.borrower.display_name
                : loan.lender.display_name}
            </Link>
          </p>
          {loan.due_date && (
            <p className="text-xs text-muted">Due: {formatDate(loan.due_date)}</p>
          )}
          {loan.notes && (
            <p className="mt-0.5 text-xs italic text-muted">{loan.notes}</p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {loan.status === "pending" && isLender && (
            <>
              <button
                onClick={() => updateStatus("active")}
                className="pressable flex min-h-9 items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-2 text-xs font-medium text-green-400"
              >
                <Check className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={() => updateStatus("declined")}
                className="pressable flex min-h-9 items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400"
              >
                <X className="h-4 w-4" /> Decline
              </button>
            </>
          )}
          {loan.status === "pending" && isBorrower && (
            <button
              onClick={() => updateStatus("cancelled")}
              className="pressable min-h-9 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted"
            >
              Cancel request
            </button>
          )}
          {loan.status === "active" && (
            <button
              onClick={() => updateStatus("returned")}
              className="pressable flex min-h-9 items-center gap-1.5 rounded-lg bg-primary/20 px-3 py-2 text-xs font-medium text-primary"
            >
              <RotateCcw className="h-4 w-4" /> Mark returned
            </button>
          )}
        </div>
      )}
    </div>
  );
}
