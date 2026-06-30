"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Users } from "lucide-react";
import { setActiveGroup } from "@/lib/group-actions";
import type { Group } from "@/lib/types";

export function GroupSwitcher({
  groups,
  activeGroupId,
}: {
  groups: Group[];
  activeGroupId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const active = groups.find((g) => g.id === activeGroupId) ?? groups[0];

  if (groups.length <= 1 && active) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted px-2 truncate max-w-[140px]">
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{active.name}</span>
      </div>
    );
  }

  function switchGroup(id: string) {
    startTransition(async () => {
      await setActiveGroup(id);
      setOpen(false);
      window.location.reload();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground max-w-[160px]"
      >
        <Users className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{active?.name ?? "Select group"}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-surface shadow-lg py-1">
            {groups.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => switchGroup(g.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-surface-2 ${
                    g.id === activeGroupId ? "text-primary font-medium" : ""
                  }`}
                >
                  {g.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
