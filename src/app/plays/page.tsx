import Link from "next/link";
import { Plus, History, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured, formatDateTime } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameCover } from "@/components/ui/GameCover";

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

  const { data: plays } = await supabase
    .from("plays")
    .select(
      `
      id, played_at, duration_minutes, notes,
      game:games (id, title, image_url),
      logger:profiles!plays_logged_by_fkey (display_name),
      play_participants (
        user_id,
        is_winner,
        score,
        profile:profiles (display_name)
      ),
      play_expansions (
        game:games (title)
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

      {(plays ?? []).length === 0 ? (
        <EmptyState
          icon={History}
          title="No plays logged yet"
          description="Record your first game night to start tracking stats."
          action={{ href: "/plays/new", label: "Log your first play" }}
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
              .filter(Boolean);

            const otherParticipants = (play.play_participants ?? [])
              .filter((pp) => !pp.is_winner)
              .map((pp) => {
                const prof = Array.isArray(pp.profile) ? pp.profile[0] : pp.profile;
                const name = prof?.display_name as string | undefined;
                if (!name) return undefined;
                return pp.score != null ? `${name} (${pp.score} pts)` : name;
              })
              .filter(Boolean);

            const expansionTitles = (play.play_expansions ?? [])
              .map((pe) => {
                const g = Array.isArray(pe.game) ? pe.game[0] : pe.game;
                return g?.title as string | undefined;
              })
              .filter(Boolean);

            return (
              <Link
                key={play.id}
                href={`/library/${game?.id}`}
                className="touch-card flex gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <GameCover
                  src={game?.image_url}
                  alt={game?.title ?? "Game"}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {game?.title ?? "Unknown"}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDateTime(play.played_at)}
                    {play.duration_minutes
                      ? ` · ${play.duration_minutes} min`
                      : ""}
                  </p>
                  {winnerNames.length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-400">
                      <Trophy className="h-3.5 w-3.5 shrink-0" />
                      {winnerNames.join(", ")}
                    </p>
                  )}
                  {otherParticipants.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      With: {otherParticipants.join(", ")}
                    </p>
                  )}
                  {expansionTitles.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted">
                      + {expansionTitles.join(", ")}
                    </p>
                  )}
                  {play.notes && (
                    <p className="mt-1 text-xs italic text-muted line-clamp-2">
                      {play.notes}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted/80">
                    Logged by {logger?.display_name}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
