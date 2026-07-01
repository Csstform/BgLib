import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { AddGameForm } from "./AddGameForm";

export default async function AddGamePage({
  searchParams,
}: {
  searchParams: Promise<{ base?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="px-4 py-6">
        <SetupBanner />
      </div>
    );
  }

  const { base: baseGameId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const groupId = await getActiveGroupId();
  if (!groupId) redirect("/onboarding");

  let baseGameTitle: string | undefined;
  if (baseGameId) {
    const { data: baseGame } = await supabase
      .from("games")
      .select("id, title, group_id")
      .eq("id", baseGameId)
      .single();

    if (!baseGame || baseGame.group_id !== groupId) {
      redirect("/add-game");
    }
    baseGameTitle = baseGame.title;
  }

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">
        {baseGameTitle ? "Add Expansion" : "Add a Game"}
      </h1>
      <p className="text-sm text-muted mb-6">
        {baseGameTitle
          ? `Add an expansion for ${baseGameTitle}`
          : "Add a new board game to your group's catalogue"}
      </p>
      <AddGameForm
        userId={user.id}
        groupId={groupId}
        baseGameId={baseGameId}
        baseGameTitle={baseGameTitle}
      />
    </div>
  );
}
