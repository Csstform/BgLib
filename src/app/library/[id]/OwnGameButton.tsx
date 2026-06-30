"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Check, Plus } from "lucide-react";

type Props = {
  gameId: string;
  userOwns: boolean;
  ownershipId?: string;
};

export function OwnGameButton({ gameId, userOwns, ownershipId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggleOwnership() {
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (userOwns && ownershipId) {
      await supabase.from("ownership").delete().eq("id", ownershipId);
    } else {
      await supabase.from("ownership").insert({
        user_id: user.id,
        game_id: gameId,
      });
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={toggleOwnership}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors disabled:opacity-50 ${
        userOwns
          ? "bg-surface-2 text-foreground border border-border hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
          : "bg-primary text-primary-fg hover:bg-primary-hover"
      }`}
    >
      {userOwns ? (
        <>
          <Check className="h-5 w-5" />
          {loading ? "Removing..." : "In my collection — tap to remove"}
        </>
      ) : (
        <>
          <Plus className="h-5 w-5" />
          {loading ? "Adding..." : "Add to my collection"}
        </>
      )}
    </button>
  );
}
