"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export function CancelGameNightButton({ gameNightId }: { gameNightId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function cancel() {
    setLoading(true);
    await fetch(`/api/game-nights/${gameNightId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelled: true }),
    });
    router.push("/game-nights");
    router.refresh();
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl border border-red-500/30 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
      >
        <XCircle className="h-4 w-4" />
        Cancel game night
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 space-y-2">
      <p className="text-sm text-red-400">Cancel this game night? Attendees will be notified.</p>
      <div className="flex gap-2">
        <button
          onClick={cancel}
          disabled={loading}
          className="flex-1 rounded-lg bg-red-500/20 py-2 text-sm font-medium text-red-400 disabled:opacity-50"
        >
          {loading ? "Cancelling..." : "Yes, cancel"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="rounded-lg px-4 py-2 text-sm text-muted"
        >
          No
        </button>
      </div>
    </div>
  );
}
