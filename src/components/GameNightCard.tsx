import Link from "next/link";
import { Calendar, MapPin, Users } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { GameNightWithDetails } from "@/lib/types";
import { OwnerAvatars } from "./OwnerAvatars";

export function GameNightCard({ night }: { night: GameNightWithDetails }) {
  const going = night.rsvps.filter((r) => r.status === "going");
  const maybe = night.rsvps.filter((r) => r.status === "maybe");

  return (
    <Link
      href={`/game-nights/${night.id}`}
      className="touch-card block rounded-xl border border-border bg-surface p-4 shadow-sm"
    >
      <h3 className="font-semibold text-lg">{night.title}</h3>
      <p className="text-sm text-muted mt-1 flex items-center gap-1.5">
        <Calendar className="h-4 w-4 shrink-0" />
        {formatDateTime(night.scheduled_at)}
      </p>
      {night.location && (
        <p className="text-sm text-muted mt-0.5 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" />
          {night.location}
        </p>
      )}
      <p className="text-xs text-muted mt-2">
        Hosted by {night.host.display_name}
      </p>

      {night.games.length > 0 && (
        <p className="text-xs text-muted mt-1">
          Games: {night.games.map((g) => g.title).join(", ")}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <Users className="h-4 w-4 text-muted" />
        <OwnerAvatars
          owners={going.map((r) => ({
            user_id: r.user_id,
            display_name: r.profile.display_name,
            avatar_url: r.profile.avatar_url,
            condition: "",
            notes: null,
            acquired_date: null,
          }))}
          max={5}
          size="sm"
        />
        <span className="text-xs text-muted">
          {going.length} going{maybe.length > 0 ? `, ${maybe.length} maybe` : ""}
        </span>
      </div>
    </Link>
  );
}
