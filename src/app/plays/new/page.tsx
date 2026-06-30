import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGroupId, getGroupMembers } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { LogPlayForm } from "../LogPlayForm";

export default async function NewPlayPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameId } = await searchParams;

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
  if (!user) redirect("/login");

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const { data: games } = await supabase
    .from("games")
    .select("id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at")
    .eq("group_id", groupId)
    .order("title");

  const members = await getGroupMembers(groupId);

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Log a Play</h1>
      <LogPlayForm
        groupId={groupId}
        games={games ?? []}
        members={members}
        userId={user.id}
        preselectedGameId={gameId}
      />
    </div>
  );
}
