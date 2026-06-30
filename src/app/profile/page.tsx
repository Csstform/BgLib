import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { ProfileForm } from "./ProfileForm";
import { PushNotificationToggle } from "@/components/PushNotificationToggle";

export default async function ProfilePage() {
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-1">My Profile</h1>
      <p className="text-sm text-muted mb-6">{user.email}</p>
      <div className="space-y-6">
        <PushNotificationToggle />
        <ProfileForm profile={profile} />
      </div>
    </div>
  );
}
