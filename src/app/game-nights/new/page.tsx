import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { CreateGameNightForm } from "./CreateGameNightForm";

export default async function NewGameNightPage() {
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

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">Plan a Game Night</h1>
      <CreateGameNightForm games={games ?? []} />
    </div>
  );
}
