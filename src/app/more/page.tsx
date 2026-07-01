import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import {
  Dices,
  Users,
  History,
  User,
  PlusCircle,
  Library,
  BarChart3,
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
    href: "/stats",
    label: "Group Stats",
    desc: "Top games, winners, and play counts",
    icon: BarChart3,
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
    desc: "Invite code, join groups, notifications, BGG import",
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
      <h1 className="animate-header text-2xl font-bold mb-6">More</h1>
      <div className="grid gap-2">
        {links.map(({ href, label, desc, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            className="touch-card stagger-item flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            style={{ "--stagger": i } as CSSProperties}
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
          className="touch-card stagger-item flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
          style={{ "--stagger": links.length } as CSSProperties}
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
