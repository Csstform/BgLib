"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Settings, Users } from "lucide-react";
import { setActiveGroup } from "@/lib/group-actions";
import type { Group } from "@/lib/types";

export function GroupSwitcher({
  groups,
  activeGroupId,
}: {
  groups: Group[];
  activeGroupId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  if (groups.length <= 1 && active) {
    return (
      <div className="flex items-center gap-1 max-w-[160px]">
        <div className="flex min-w-0 items-center gap-1.5 truncate px-2 text-xs text-muted">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{active.name}</span>
        </div>
        <Link
          href="/profile#group"
          className="pressable shrink-0 rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-foreground"
          title="Group settings"
          aria-label="Group settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  function switchGroup(id: string) {
    startTransition(async () => {
      await setActiveGroup(id);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="pressable flex max-w-[160px] items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{active?.name ?? "Select group"}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 animate-fade-in bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div className="animate-dropdown absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border bg-surface py-1 shadow-lg">
            <ul>
              {groups.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => switchGroup(g.id)}
                    className={`pressable w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                      g.id === activeGroupId ? "font-medium text-primary" : ""
                    }`}
                  >
                    {g.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-border px-3 py-2">
              <Link
                href="/profile#group"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Create or manage groups
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
