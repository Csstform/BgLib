"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  dispatchRealtimeChange,
  LIBRARY_DATA_TABLES,
  tableAffectsPath,
  type RealtimeTable,
} from "@/lib/realtime-scope";

const DEBOUNCE_MS = 900;

export function RealtimeRefresh({ groupId }: { groupId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const pendingTables = useRef<Set<RealtimeTable>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!groupId) return;

    function flush() {
      const tables = [...pendingTables.current];
      pendingTables.current.clear();
      timerRef.current = null;
      if (tables.length === 0) return;

      const path = pathnameRef.current;
      const libraryOnly = tables.every((t) =>
        LIBRARY_DATA_TABLES.includes(t)
      );

      if (
        libraryOnly &&
        tableAffectsPath("games", path) &&
        path.startsWith("/library")
      ) {
        dispatchRealtimeChange(tables);
        return;
      }

      const shouldRefresh = tables.some((t) =>
        tableAffectsPath(t, path)
      );
      if (shouldRefresh) {
        router.refresh();
      }
    }

    function schedule(table: RealtimeTable) {
      pendingTables.current.add(table);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, DEBOUNCE_MS);
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`bglib-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans" },
        () => schedule("loans")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_night_rsvps" },
        () => schedule("game_night_rsvps")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `group_id=eq.${groupId}`,
        },
        () => schedule("games")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plays",
          filter: `group_id=eq.${groupId}`,
        },
        () => schedule("plays")
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "want_to_play",
          filter: `group_id=eq.${groupId}`,
        },
        () => schedule("want_to_play")
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [groupId, router]);

  return null;
}
