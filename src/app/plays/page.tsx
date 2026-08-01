import Link from "next/link";
import { Plus, History } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlayHistoryCard } from "@/components/PlayHistoryCard";

export default async function PlaysPage() {
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

  const { data: plays, error: playsError } = await supabase
    .from("plays")
    .select(
      `
      id, played_at, duration_minutes, notes, logged_by,
      game:games!plays_game_id_fkey (id, title, image_url),
      logger:profiles!plays_logged_by_fkey (display_name),
      play_participants (
        user_id,
        is_winner,
        score,
        profile:profiles!play_participants_user_id_fkey (display_name)
      ),
      play_expansions (
        game:games!play_expansions_game_id_fkey (title)
      )
    `
    )
    .eq("group_id", groupId)
    .order("played_at", { ascending: false })
    .limit(50);

  return (
    <div className="page-shell">
      <PageHeader
        title="Play History"
        subtitle="Games your group has played"
        action={
          <Link
            href="/plays/new"
            className="btn-primary pressable flex min-h-10 items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" />
            Log
          </Link>
        }
      />

      {playsError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Could not load play history: {playsError.message}
        </div>
      )}

      {(plays ?? []).length === 0 ? (
        <EmptyState
          icon={History}
          title={playsError ? "Play history unavailable" : "No plays logged yet"}
          description={
            playsError
              ? "If this persists, ensure database migration 010_play_winners_stats.sql has been applied in Supabase."
              : "Record your first game night to start tracking stats."
          }
          action={
            playsError
              ? undefined
              : { href: "/plays/new", label: "Log your first play" }
          }
        />
      ) : (
        <div className="space-y-2">
          {(plays ?? []).map((play) => {
            const game = Array.isArray(play.game) ? play.game[0] : play.game;
            const logger = Array.isArray(play.logger)
              ? play.logger[0]
              : play.logger;

            const winnerNames = (play.play_participants ?? [])
              .filter((pp) => pp.is_winner)
              .map((pp) => {
                const prof = Array.isArray(pp.profile) ? pp.profile[0] : pp.profile;
                return prof?.display_name as string | undefined;
              })
              .filter(Boolean) as string[];

            const otherParticipants = (play.play_participants ?? [])
              .filter((pp) => !pp.is_winner)
              .map((pp) => {
                const prof = Array.isArray(pp.profile) ? pp.profile[0] : pp.profile;
                const name = prof?.display_name as string | undefined;
                if (!name) return undefined;
                return pp.score != null ? `${name} (${pp.score} pts)` : name;
              })
              .filter(Boolean) as string[];

            const expansionTitles = (play.play_expansions ?? [])
              .map((pe) => {
                const g = Array.isArray(pe.game) ? pe.game[0] : pe.game;
                return g?.title as string | undefined;
              })
              .filter(Boolean) as string[];

            return (
              <PlayHistoryCard
                key={play.id}
                currentUserId={user?.id}
                play={{
                  id: play.id,
                  played_at: play.played_at,
                  duration_minutes: play.duration_minutes,
                  notes: play.notes,
                  logged_by: play.logged_by,
                  game: game
                    ? {
                        id: game.id,
                        title: game.title,
                        image_url: game.image_url,
                      }
                    : null,
                  logger: logger
                    ? { display_name: logger.display_name }
                    : null,
                  winnerNames,
                  otherParticipants,
                  expansionTitles,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
