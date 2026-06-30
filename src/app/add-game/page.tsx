import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { AddGameForm } from "./AddGameForm";

export default async function AddGamePage() {
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

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">Add a Game</h1>
      <p className="text-sm text-muted mb-6">
        Add a new board game to your group&apos;s catalogue
      </p>
      <AddGameForm userId={user.id} groupId={groupId} />
    </div>
  );
}
