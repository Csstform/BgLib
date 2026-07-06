import Link from "next/link";
import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import {
  Dices,
  Users,
  History,
  User,
  BarChart3,
  ArrowLeftRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/utils";
import { SetupBanner } from "@/components/SetupBanner";
import { PageHeader } from "@/components/ui/PageHeader";

const sections = [
  {
    title: "Your games",
    links: [
      {
        href: "/collection",
        label: "My Collection",
        desc: "Games you own in this group",
        icon: Dices,
      },
    ],
  },
  {
    title: "Group activity",
    links: [
      {
        href: "/plays",
        label: "Play History",
        desc: "Sessions your group has logged",
        icon: History,
      },
      {
        href: "/stats",
        label: "Group Stats",
        desc: "Top games, winners, and trends",
        icon: BarChart3,
      },
      {
        href: "/users",
        label: "Players",
        desc: "Group members and their games",
        icon: Users,
      },
      {
        href: "/loans",
        label: "Loans",
        desc: "Borrowed and lent games",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
    title: "Account",
    links: [
      {
        href: "/profile",
        label: "Profile & Settings",
        desc: "Invite code, notifications, BGG import",
        icon: User,
      },
    ],
  },
];

export default async function MorePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="page-shell">
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let stagger = 0;

  return (
    <div className="page-shell">
      <PageHeader
        title="More"
        subtitle="Collection, activity, and settings"
      />

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {section.title}
            </h2>
            <div className="grid gap-2">
              {section.links.map(({ href, label, desc, icon: Icon }) => {
                const i = stagger++;
                return (
                  <Link
                    key={href}
                    href={href}
                    className="touch-card stagger-item flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
                    style={{ "--stagger": i } as CSSProperties}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{label}</p>
                      <p className="truncate text-sm text-muted">{desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
