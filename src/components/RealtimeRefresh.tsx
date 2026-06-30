"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function RealtimeRefresh({ groupId }: { groupId: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!groupId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`bglib-${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loans" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_night_rsvps" },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "games",
          filter: `group_id=eq.${groupId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "plays",
          filter: `group_id=eq.${groupId}`,
        },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "want_to_play",
          filter: `group_id=eq.${groupId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, router]);

  return null;
}
