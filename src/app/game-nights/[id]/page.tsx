import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Users, History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, formatDateTime, formatRsvpStatus } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { GameCover } from "@/components/ui/GameCover";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RsvpButtons } from "./RsvpButtons";
import { CancelGameNightButton } from "./CancelGameNightButton";
import { GameNightPicker } from "@/components/GameNightPicker";
import { StartPlayerRandomizer } from "@/components/StartPlayerRandomizer";
import { GameNightCalendarActions } from "@/components/GameNightCalendarActions";
import { gameNightToIcsEvent } from "@/lib/game-night-calendar";
import { getInitials } from "@/lib/utils";
import { isGroupMember } from "@/lib/group";

export default async function GameNightDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
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

  if (night.group_id && user && !(await isGroupMember(night.group_id))) {
    notFound();
  }

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

  const goingUserIds = rsvps
    .filter((r: { status: string }) => r.status === "going")
    .map((r: { user_id: string }) => r.user_id);

  const plannedGameIds = games.map((g: { id: string }) => g.id);
  const isPast = new Date(night.scheduled_at) < new Date();

  const grouped = {
    going: rsvps.filter((r: { status: string }) => r.status === "going"),
    maybe: rsvps.filter((r: { status: string }) => r.status === "maybe"),
    declined: rsvps.filter((r: { status: string }) => r.status === "declined"),
  };

  const logPlayHref =
    games.length === 1
      ? `/plays/new?game=${games[0].id}`
      : "/plays/new";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const calendarEvent = gameNightToIcsEvent(
    {
      id: night.id,
      title: night.title,
      description: night.description,
      location: night.location,
      scheduled_at: night.scheduled_at,
      host_name: host.display_name,
      game_titles: games.map((g: { title: string }) => g.title),
    },
    appUrl
  );

  const goingPlayers = grouped.going.map(
    (r: {
      user_id: string;
      profile: { display_name: string; avatar_url: string | null };
    }) => ({
      id: r.user_id,
      name: r.profile.display_name,
      avatar_url: r.profile.avatar_url,
    })
  );

  return (
    <div className="page-shell">
      <Link
        href="/game-nights"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        All game nights
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="p-4">
          <h1 className="text-2xl font-bold">{night.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            {formatDateTime(night.scheduled_at)}
            {isPast && (
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                Past
              </span>
            )}
          </p>
          {night.location && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
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
      </div>

      {!night.cancelled_at && (
        <GameNightCalendarActions gameNightId={night.id} event={calendarEvent} />
      )}

      {!isPast && goingPlayers.length > 0 && (
        <div className="mt-4">
          <StartPlayerRandomizer
            key={goingPlayers.map((p: { id: string }) => p.id).join(",")}
            players={goingPlayers}
            description="Randomize who goes first among players marked Going."
          />
        </div>
      )}

      {isPast && (
        <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">This game night has passed.</p>
          <p className="mt-1 text-sm text-muted">
            Log what you played to keep your group&apos;s history up to date.
          </p>
          <Link
            href={logPlayHref}
            className="btn-primary mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            <History className="h-4 w-4" />
            Log plays
          </Link>
        </div>
      )}

      {games.length > 0 && (
        <div className="mt-6">
          <SectionHeading title="Planned games" />
          <div className="space-y-2">
            {games.map((g: { id: string; title: string; image_url: string | null }) => (
              <Link
                key={g.id}
                href={`/library/${g.id}`}
                className="touch-card flex items-center gap-3 rounded-xl border border-border bg-surface p-2 hover:border-primary/30"
              >
                <GameCover src={g.image_url} alt={g.title} size="sm" />
                <span className="text-sm font-medium">{g.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!isPast && (
        <div className="section-card mt-6 p-4">
          <GameNightPicker
            gameNightId={night.id}
            hostId={night.host_id}
            currentUserId={user?.id ?? ""}
            goingUserIds={goingUserIds}
            plannedGameIds={plannedGameIds}
          />
        </div>
      )}

      {user && !isPast && (
        <div className="mt-6">
          <RsvpButtons
            gameNightId={night.id}
            userId={user.id}
            currentStatus={userRsvp?.status}
          />
        </div>
      )}

      <div className="mt-6 space-y-4">
        <SectionHeading icon={Users} title="Attendees" />
        {(["going", "maybe", "declined"] as const).map((status) =>
          grouped[status].length > 0 ? (
            <div key={status}>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                {formatRsvpStatus(status)} ({grouped[status].length})
              </p>
              <div className="section-card divide-y divide-border">
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

      {user && user.id === night.host_id && !night.cancelled_at && !isPast && (
        <CancelGameNightButton gameNightId={night.id} />
      )}
    </div>
  );
}
