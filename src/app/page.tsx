import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { HomeDashboard } from "@/components/HomeDashboard";
import { LandingPage } from "@/components/LandingPage";

export default async function HomePage() {
  const configured = isSupabaseConfigured();
  let user = null;

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  if (user) {
    return <HomeDashboard userId={user.id} />;
  }

  return <LandingPage />;
}
