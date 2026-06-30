import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameNightCard } from "@/components/GameNightCard";
import type { GameNightWithDetails } from "@/lib/types";

export default async function GameNightsPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const supabase = await createClient();

  const { data: nights } = await supabase
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

  return (
    <div className="px-4 py-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Game Nights</h1>
          <p className="text-sm text-muted mt-0.5">
            Upcoming sessions with your group
          </p>
        </div>
        <Link
          href="/game-nights/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          Plan
        </Link>
      </div>

      {nightsWithDetails.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">No upcoming game nights.</p>
          <Link
            href="/game-nights/new"
            className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
          >
            Plan the first one
          </Link>
        </div>
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
