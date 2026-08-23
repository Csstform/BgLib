import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId, isGroupMember } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameNightForm } from "@/components/GameNightForm";

export default async function EditGameNightPage({
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

  if (!user) redirect("/login");

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  const { data: night } = await supabase
    .from("game_nights")
    .select(
      `
      id,
      title,
      description,
      scheduled_at,
      location,
      host_id,
      group_id,
      cancelled_at,
      game_night_games (game_id)
    `
    )
    .eq("id", id)
    .single();

  if (!night) notFound();
  if (night.group_id && !(await isGroupMember(night.group_id))) notFound();
  if (night.host_id !== user.id) redirect(`/game-nights/${id}`);
  if (night.cancelled_at) redirect(`/game-nights/${id}`);

  const { data: games } = await supabase
    .from("games")
    .select("id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at")
    .eq("group_id", night.group_id ?? groupId)
    .order("title");

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-bold">Edit game night</h1>
      <GameNightForm
        games={games ?? []}
        night={{
          id: night.id,
          title: night.title,
          description: night.description,
          scheduled_at: night.scheduled_at,
          location: night.location,
          game_ids: (night.game_night_games ?? []).map(
            (row: { game_id: string }) => row.game_id
          ),
        }}
      />
    </div>
  );
}
