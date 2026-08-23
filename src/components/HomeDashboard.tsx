import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Sparkles,
  History,
  PackageOpen,
  ChevronRight,
  Trophy,
  Library,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { LocalDateTime } from "@/components/LocalDateTime";
import { computeNeverPlayedGames } from "@/lib/play-stats";
import { GameCover } from "@/components/ui/GameCover";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { CSSProperties } from "react";
import type { GameNightWithDetails } from "@/lib/types";

export async function HomeDashboard({ userId }: { userId: string }) {
  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();

  const now = new Date().toISOString();

  const [
    { data: nextNightRow },
    { data: recentPlays },
    { data: games },
    { data: allPlays },
    { data: ownerships },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("game_nights")
      .select(
        `
        *,
        host:profiles!game_nights_host_id_fkey (id, display_name, avatar_url, bio, created_at),
        rsvps:game_night_rsvps (
          id, game_night_id, user_id, status, created_at,
          profile:profiles (id, display_name, avatar_url, bio, created_at)
        ),
        game_night_games (
          game:games (id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at)
        )
      `
      )
      .eq("group_id", groupId)
      .is("cancelled_at", null)
      .gte("scheduled_at", now)
      .order("scheduled_at")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("plays")
      .select(
        `
        id, game_id, played_at,
        game:games!plays_game_id_fkey (id, title, image_url),
        play_participants (
          is_winner,
          profile:profiles!play_participants_user_id_fkey (display_name)
        )
      `
      )
      .eq("group_id", groupId)
      .order("played_at", { ascending: false })
      .limit(4),
    supabase
      .from("games")
      .select("id, title, image_url")
      .eq("group_id", groupId),
    supabase.from("plays").select("game_id").eq("group_id", groupId),
    supabase.from("ownership").select("game_id"),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single(),
  ]);

  const nextNight: GameNightWithDetails | null = nextNightRow
    ? {
        id: nextNightRow.id,
        title: nextNightRow.title,
        description: nextNightRow.description,
        host_id: nextNightRow.host_id,
        scheduled_at: nextNightRow.scheduled_at,
        location: nextNightRow.location,
        created_at: nextNightRow.created_at,
        host: Array.isArray(nextNightRow.host)
          ? nextNightRow.host[0]
          : nextNightRow.host,
        rsvps: (nextNightRow.rsvps ?? []).map(
          (r: {
            id: string;
            game_night_id: string;
            user_id: string;
            status: "going" | "maybe" | "declined";
            created_at: string;
            profile: unknown;
          }) => ({
            id: r.id,
            game_night_id: r.game_night_id,
            user_id: r.user_id,
            status: r.status,
            created_at: r.created_at,
            profile: Array.isArray(r.profile) ? r.profile[0] : r.profile,
          })
        ),
        games: (nextNightRow.game_night_games ?? [])
          .map((gng: { game: unknown }) =>
            Array.isArray(gng.game) ? gng.game[0] : gng.game
          )
          .filter(Boolean),
      }
    : null;

  const playedGameIds = new Set((allPlays ?? []).map((p) => p.game_id));
  const groupGameIds = new Set((games ?? []).map((g) => g.id));
  const ownedGameIds = new Set(
    (ownerships ?? [])
      .map((o) => o.game_id)
      .filter((id) => groupGameIds.has(id))
  );
  const neverPlayed = computeNeverPlayedGames(
    games ?? [],
    playedGameIds,
    ownedGameIds
  ).slice(0, 4);

  const displayName = profile?.display_name ?? "there";
  const goingCount = nextNight
    ? nextNight.rsvps.filter((r) => r.status === "going").length
    : 0;

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="animate-header text-2xl font-bold">
          Hey, {displayName.split(" ")[0]}!
        </h1>
        <p
          className="animate-header mt-1 text-muted"
          style={{ animationDelay: "60ms" }}
        >
          Here&apos;s what&apos;s happening with your group
        </p>
      </div>

      <Link
        href="/picker"
        className="touch-card stagger-item flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4"
        style={{ "--stagger": 1 } as CSSProperties}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">What can we play?</h2>
          <p className="text-sm text-muted">Get suggestions for tonight</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Link>

      {nextNight && (
        <section className="stagger-item" style={{ "--stagger": 2 } as CSSProperties}>
          <SectionHeading
            icon={CalendarDays}
            title="Next game night"
            action={
              <Link
                href="/game-nights"
                className="text-sm text-primary hover:underline"
              >
                All nights
              </Link>
            }
          />
          <Link
            href={`/game-nights/${nextNight.id}`}
            className="touch-card block rounded-xl border border-border bg-surface p-4"
          >
            <h3 className="font-semibold">{nextNight.title}</h3>
            <p className="mt-1 text-sm text-muted">
              <LocalDateTime iso={nextNight.scheduled_at} />
              {nextNight.location ? ` · ${nextNight.location}` : ""}
            </p>
            <p className="mt-2 text-xs text-muted">
              {goingCount} going · Hosted by {nextNight.host.display_name}
            </p>
          </Link>
        </section>
      )}

      <section className="stagger-item" style={{ "--stagger": 3 } as CSSProperties}>
        <SectionHeading
          icon={History}
          title="Recent plays"
          action={
            <Link href="/plays" className="text-sm text-primary hover:underline">
              View all
            </Link>
          }
        />
        {(recentPlays ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-center">
            <p className="text-sm text-muted">No plays logged yet.</p>
            <Link
              href="/plays/new"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              Log your first play
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentPlays ?? []).map((play) => {
              const game = Array.isArray(play.game) ? play.game[0] : play.game;
              const winners = (play.play_participants ?? [])
                .filter((pp) => pp.is_winner)
                .map((pp) => {
                  const prof = Array.isArray(pp.profile)
                    ? pp.profile[0]
                    : pp.profile;
                  return prof?.display_name as string | undefined;
                })
                .filter(Boolean) as string[];

              return (
                <Link
                  key={play.id}
                  href={game ? `/library/${game.id}` : "/plays"}
                  className="touch-card flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  <GameCover
                    src={game?.image_url}
                    alt={game?.title ?? "Game"}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {game?.title ?? "Unknown game"}
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(play.played_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                      {winners.length > 0 && (
                        <>
                          {" · "}
                          <Trophy className="inline h-3 w-3 text-amber-400 -mt-0.5" />
                          {winners.join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {neverPlayed.length > 0 && (
        <section className="stagger-item" style={{ "--stagger": 4 } as CSSProperties}>
          <SectionHeading
            icon={PackageOpen}
            title="Ready to hit the table"
            action={
              <Link href="/picker" className="text-sm text-primary hover:underline">
                Pick one
              </Link>
            }
          />
          <p className="mb-2 text-sm text-muted">
            Owned games your group hasn&apos;t played yet
          </p>
          <div className="grid grid-cols-2 gap-2">
            {neverPlayed.map((g) => (
              <Link
                key={g.game_id}
                href={`/library/${g.game_id}`}
                className="touch-card flex items-center gap-2 rounded-xl border border-border bg-surface p-2"
              >
                <GameCover src={g.image_url} alt={g.title} size="sm" />
                <span className="min-w-0 truncate text-sm font-medium">
                  {g.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Quick links
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { href: "/library", icon: Library, label: "Library" },
            { href: "/stats", icon: BarChart3, label: "Stats" },
            { href: "/game-nights", icon: CalendarDays, label: "Game nights" },
            { href: "/plays", icon: History, label: "Play history" },
          ].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="touch-card flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium"
            >
              <Icon className="h-4 w-4 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
