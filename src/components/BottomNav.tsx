"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Library,
  LayoutGrid,
  Sparkles,
  CalendarDays,
  ArrowLeftRight,
} from "lucide-react";

const navItems = [
  { href: "/library", label: "Library", icon: Library, match: ["/library"] },
  { href: "/picker", label: "Picker", icon: Sparkles, match: ["/picker"] },
  {
    href: "/game-nights",
    label: "Nights",
    icon: CalendarDays,
    match: ["/game-nights"],
  },
  { href: "/loans", label: "Loans", icon: ArrowLeftRight, match: ["/loans"] },
  {
    href: "/more",
    label: "More",
    icon: LayoutGrid,
    match: ["/more", "/collection", "/users", "/plays", "/add-game", "/profile"],
  },
];

function isActive(pathname: string, match: string[]) {
  return match.some(
    (m) => pathname === m || (m !== "/" && pathname.startsWith(m + "/"))
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md safe-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1">
        {navItems.map(({ href, label, icon: Icon, match }) => {
          const active = isActive(pathname, match);
          return (
            <Link
              key={href}
              href={href}
              className={`nav-tab flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-xs min-w-[52px] ${
                active ? "nav-tab-active font-medium" : "text-muted"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
