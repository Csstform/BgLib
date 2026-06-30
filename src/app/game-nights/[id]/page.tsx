import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, formatDateTime, formatRsvpStatus } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { RsvpButtons } from "./RsvpButtons";
import { CancelGameNightButton } from "./CancelGameNightButton";
import { getInitials } from "@/lib/utils";

export default async function GameNightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: night } = await supabase
    .from("game_nights")
    .select(
      `
      *,
      host:profiles!game_nights_host_id_fkey (id, display_name, avatar_url),
      rsvps:game_night_rsvps (
        id, user_id, status,
        profile:profiles (id, display_name, avatar_url)
      ),
      game_night_games (
        game:games (id, title, image_url)
      )
    `
    )
    .eq("id", id)
    .single();

  if (!night) notFound();

  const host = Array.isArray(night.host) ? night.host[0] : night.host;
  const rsvps = (night.rsvps ?? []).map(
    (r: {
      id: string;
      user_id: string;
      status: string;
      profile: { id: string; display_name: string; avatar_url: string | null };
    }) => ({
      ...r,
      profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
    })
  );
  const games = (night.game_night_games ?? [])
    .map((gng: { game: { id: string; title: string; image_url: string | null } }) =>
      Array.isArray(gng.game) ? gng.game[0] : gng.game
    )
    .filter(Boolean);

  const userRsvp = user
    ? rsvps.find((r: { user_id: string }) => r.user_id === user.id)
    : null;

  const grouped = {
    going: rsvps.filter((r: { status: string }) => r.status === "going"),
    maybe: rsvps.filter((r: { status: string }) => r.status === "maybe"),
    declined: rsvps.filter((r: { status: string }) => r.status === "declined"),
  };

  return (
    <div className="px-4 py-6 pb-24">
      <Link
        href="/game-nights"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        All game nights
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h1 className="text-2xl font-bold">{night.title}</h1>
        <p className="mt-2 text-sm flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-primary" />
          {formatDateTime(night.scheduled_at)}
        </p>
        {night.location && (
          <p className="mt-1 text-sm flex items-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4" />
            {night.location}
          </p>
        )}
        {night.description && (
          <p className="mt-3 text-sm leading-relaxed">{night.description}</p>
        )}
        <p className="mt-3 text-sm text-muted">
          Hosted by{" "}
          <Link href={`/users/${host.id}`} className="text-primary hover:underline">
            {host.display_name}
          </Link>
        </p>
      </div>

      {games.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold mb-2">Planned games</h2>
          <div className="space-y-2">
            {games.map((g: { id: string; title: string; image_url: string | null }) => (
              <Link
                key={g.id}
                href={`/library/${g.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2 hover:border-primary/30"
              >
                <span className="text-xl">🎲</span>
                <span className="text-sm font-medium">{g.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {user && (
        <div className="mt-6">
          <RsvpButtons
            gameNightId={night.id}
            userId={user.id}
            currentStatus={userRsvp?.status}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Users className="h-5 w-5" />
          Attendees
        </h2>
        {(["going", "maybe", "declined"] as const).map((status) =>
          grouped[status].length > 0 ? (
            <div key={status}>
              <p className="text-xs font-medium text-muted mb-1 uppercase tracking-wide">
                {formatRsvpStatus(status)} ({grouped[status].length})
              </p>
              <div className="rounded-xl border border-border bg-surface divide-y divide-border">
                {grouped[status].map(
                  (r: {
                    id: string;
                    profile: {
                      id: string;
                      display_name: string;
                      avatar_url: string | null;
                    };
                  }) => (
                    <Link
                      key={r.id}
                      href={`/users/${r.profile.id}`}
                      className="flex items-center gap-3 p-2 hover:bg-surface-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                        {r.profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={r.profile.avatar_url}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          getInitials(r.profile.display_name)
                        )}
                      </div>
                      <span className="text-sm">{r.profile.display_name}</span>
                    </Link>
                  )
                )}
              </div>
            </div>
          ) : null
        )}
      </div>

      {user && user.id === night.host_id && !night.cancelled_at && (
        <CancelGameNightButton gameNightId={night.id} />
      )}
    </div>
  );
}
