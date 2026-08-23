import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameNightCard } from "@/components/GameNightCard";
import { GameNightsCalendarExport } from "@/components/GameNightsCalendarExport";
import { createCalendarFeedToken } from "@/lib/calendar-feed";
import type { GameNightWithDetails } from "@/lib/types";

export default async function GameNightsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: nights } = await supabase
    .from("game_nights")
    .select(
      `
      *,
      host:profiles!game_nights_host_id_fkey (id, display_name, real_name, avatar_url, bio, created_at),
      rsvps:game_night_rsvps (
        id, game_night_id, user_id, status, created_at,
        profile:profiles (id, display_name, real_name, avatar_url, bio, created_at)
      ),
      game_night_games (
        game:games (id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at)
      )
    `
    )
    .eq("group_id", groupId)
    .is("cancelled_at", null)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at");

  const nightsWithDetails: GameNightWithDetails[] = (nights ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    description: n.description,
    host_id: n.host_id,
    scheduled_at: n.scheduled_at,
    location: n.location,
    created_at: n.created_at,
    host: Array.isArray(n.host) ? n.host[0] : n.host,
    rsvps: (n.rsvps ?? []).map(
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
    games: (n.game_night_games ?? [])
      .map((gng: { game: unknown }) =>
        Array.isArray(gng.game) ? gng.game[0] : gng.game
      )
      .filter(Boolean),
  }));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const feedToken =
    user && groupId ? createCalendarFeedToken(user.id, groupId) : null;

  return (
    <div className="page-shell">
      <PageHeader
        title="Game Nights"
        subtitle="Upcoming sessions with your group"
        action={
          <Link
            href="/game-nights/new"
            className="btn-primary pressable flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Plan
          </Link>
        }
      />

      {feedToken && (
        <div className="mb-4">
          <GameNightsCalendarExport
            feedToken={feedToken}
            appUrl={appUrl}
            nightCount={nightsWithDetails.length}
          />
        </div>
      )}

      {nightsWithDetails.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No upcoming game nights"
          description="Plan a session so your group can RSVP and suggest games."
          action={{ href: "/game-nights/new", label: "Plan the first one" }}
        />
      ) : (
        <div className="space-y-3">
          {nightsWithDetails.map((night) => (
            <GameNightCard key={night.id} night={night} />
          ))}
        </div>
      )}
    </div>
  );
}
