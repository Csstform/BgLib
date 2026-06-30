import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Dices,
  Users,
  History,
  User,
  PlusCircle,
  Library,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";

const links = [
  {
    href: "/collection",
    label: "My Collection",
    desc: "Games you own in this group",
    icon: Dices,
  },
  {
    href: "/users",
    label: "Players",
    desc: "Group members and their games",
    icon: Users,
  },
  {
    href: "/plays",
    label: "Play History",
    desc: "Sessions your group has logged",
    icon: History,
  },
  {
    href: "/add-game",
    label: "Add a Game",
    desc: "Add to the group catalogue",
    icon: PlusCircle,
  },
  {
    href: "/profile",
    label: "Profile & Settings",
    desc: "Invite code, notifications, BGG import",
    icon: User,
  },
];

export default async function MorePage() {
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

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="text-2xl font-bold mb-6">More</h1>
      <div className="grid gap-2">
        {links.map(({ href, label, desc, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">{label}</p>
              <p className="text-sm text-muted truncate">{desc}</p>
            </div>
          </Link>
        ))}
        <Link
          href="/library"
          className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 hover:border-primary/30 transition-colors"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary shrink-0">
            <Library className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Full Library</p>
            <p className="text-sm text-muted">Browse all group games</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
