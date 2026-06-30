import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserGroups } from "@/lib/group";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
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
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/library");

  const groups = await getUserGroups();

  return (
    <div className="px-4 py-8 pb-24 min-h-[calc(100dvh-3.5rem)] flex flex-col justify-center">
      <OnboardingWizard hasGroup={groups.length > 0} />
    </div>
  );
}
