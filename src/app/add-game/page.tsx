import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { getActiveGroupId } from "@/lib/group";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";
import { AddGameForm } from "./AddGameForm";

export default async function AddGamePage({
  searchParams,
}: {
  searchParams: Promise<{ base?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
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
    <div className="page-shell">
      <PageHeader
        title={baseGameTitle ? "Add Expansion" : "Add a Game"}
        subtitle={
          baseGameTitle
            ? `Add an expansion for ${baseGameTitle}`
            : "Add a new board game to your group's catalogue"
        }
      />
      <AddGameForm
        userId={user.id}
        groupId={groupId}
        baseGameId={baseGameId}
        baseGameTitle={baseGameTitle}
      />
    </div>
  );
}
