import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroups, getActiveGroupId } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { OnboardingWizard } from "./OnboardingWizard";
import { isEmailConfigured } from "@/lib/email";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, email_notifications")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/library");

  const { invite } = await searchParams;
  const groups = await getUserGroups();
  const groupId = await getActiveGroupId();

  return (
    <div className="page-shell mx-auto flex min-h-[calc(100dvh-var(--header-height))] max-w-md flex-col justify-center">
      <h1 className="mb-6 text-center text-2xl font-bold">Welcome to BgLib</h1>
      <OnboardingWizard
        groups={groups}
        userId={user.id}
        groupId={groupId}
        emailConfigured={isEmailConfigured()}
        emailNotificationsEnabled={profile?.email_notifications !== false}
        initialInviteCode={invite}
      />
    </div>
  );
}
