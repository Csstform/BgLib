"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatRsvpStatus } from "@/lib/utils";

type RsvpStatus = "going" | "maybe" | "declined";

export function RsvpButtons({
  gameNightId,
  userId,
  currentStatus,
}: {
  gameNightId: string;
  userId: string;
  currentStatus?: RsvpStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<RsvpStatus | null>(null);

  async function setRsvp(status: RsvpStatus) {
    setLoading(status);
    const supabase = createClient();
    await supabase.from("game_night_rsvps").upsert(
      { game_night_id: gameNightId, user_id: userId, status },
      { onConflict: "game_night_id,user_id" }
    );
    router.refresh();
    setLoading(null);
  }

  const buttons: { status: RsvpStatus; label: string; active: string }[] = [
    { status: "going", label: "Going", active: "bg-green-500/20 text-green-400 border-green-500/30" },
    { status: "maybe", label: "Maybe", active: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
    { status: "declined", label: "Can't go", active: "bg-red-500/20 text-red-400 border-red-500/30" },
  ];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Your RSVP</p>
      <div className="flex gap-2">
        {buttons.map(({ status, label, active }) => (
          <button
            key={status}
            onClick={() => setRsvp(status)}
            disabled={loading !== null}
            className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
              currentStatus === status
                ? active
                : "border-border bg-surface-2 text-muted hover:text-foreground"
            }`}
          >
            {loading === status ? "..." : label}
          </button>
        ))}
      </div>
      {currentStatus && (
        <p className="text-xs text-muted">
          You&apos;re marked as {formatRsvpStatus(currentStatus).toLowerCase()}
        </p>
      )}
    </div>
  );
}
