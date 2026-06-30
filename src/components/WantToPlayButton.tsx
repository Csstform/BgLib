"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Heart } from "lucide-react";

export function WantToPlayButton({
  gameId,
  groupId,
  userId,
  wantsToPlay,
}: {
  gameId: string;
  groupId: string;
  userId: string;
  wantsToPlay: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState(wantsToPlay);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();

    if (active) {
      await supabase
        .from("want_to_play")
        .delete()
        .eq("user_id", userId)
        .eq("game_id", gameId)
        .eq("group_id", groupId);
      setActive(false);
    } else {
      await supabase.from("want_to_play").insert({
        user_id: userId,
        game_id: gameId,
        group_id: groupId,
      });
      setActive(true);
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors disabled:opacity-50 ${
        active
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-surface-2 text-foreground border border-border hover:border-primary/30"
      }`}
    >
      <Heart className={`h-5 w-5 ${active ? "fill-current" : ""}`} />
      {loading
        ? "..."
        : active
          ? "Want to play — tap to remove"
          : "Want to play this"}
    </button>
  );
}
