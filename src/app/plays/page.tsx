import Link from "next/link";
import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured, formatDateTime } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";

export default async function PlaysPage() {
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

  const { data: plays } = await supabase
    .from("plays")
    .select(
      `
      id, played_at, duration_minutes, notes,
      game:games (id, title, image_url),
      logger:profiles!plays_logged_by_fkey (display_name),
      play_participants (
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
    <div className="px-4 py-6 pb-24">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Play History</h1>
          <p className="text-sm text-muted mt-0.5">Games your group has played</p>
        </div>
        <Link
          href="/plays/new"
          className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-fg"
        >
          <Plus className="h-4 w-4" />
          Log
        </Link>
      </div>

      {(plays ?? []).length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted mb-4">No plays logged yet.</p>
          <Link
            href="/plays/new"
            className="inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg"
          >
            Log your first play
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(plays ?? []).map((play) => {
            const game = Array.isArray(play.game) ? play.game[0] : play.game;
            const logger = Array.isArray(play.logger)
              ? play.logger[0]
              : play.logger;
            const participants = (play.play_participants ?? [])
              .map((pp) => {
                const prof = Array.isArray(pp.profile) ? pp.profile[0] : pp.profile;
                return prof?.display_name as string | undefined;
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
                className="block rounded-xl border border-border bg-surface p-3 hover:border-primary/30"
              >
                <p className="font-semibold">{game?.title ?? "Unknown"}</p>
                <p className="text-sm text-muted">
                  {formatDateTime(play.played_at)}
                  {play.duration_minutes
                    ? ` · ${play.duration_minutes} min`
                    : ""}
                </p>
                {participants.length > 0 && (
                  <p className="text-xs text-muted mt-1">
                    With: {participants.join(", ")}
                  </p>
                )}
                {expansionTitles.length > 0 && (
                  <p className="text-xs text-muted mt-1">
                    Expansions: {expansionTitles.join(", ")}
                  </p>
                )}
                {play.notes && (
                  <p className="text-xs text-muted mt-1 italic">{play.notes}</p>
                )}
                <p className="text-xs text-muted mt-0.5">
                  Logged by {logger?.display_name}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
