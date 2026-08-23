import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { GameNightForm } from "@/components/GameNightForm";

export default async function NewGameNightPage() {
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

  const { data: games } = await supabase
    .from("games")
    .select("id, title, description, min_players, max_players, play_time_minutes, image_url, bgg_id, created_by, created_at")
    .eq("group_id", groupId)
    .order("title");

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-bold">Plan a Game Night</h1>
      <GameNightForm games={games ?? []} />
    </div>
  );
}
