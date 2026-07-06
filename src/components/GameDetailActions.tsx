"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { OwnGameButton } from "@/app/library/[id]/OwnGameButton";
import { WantToPlayButton } from "@/components/WantToPlayButton";

type Props = {
  gameId: string;
  groupId: string;
  userId: string;
  userOwns: boolean;
  ownershipId?: string;
  wantsToPlay: boolean;
};

export function GameDetailActions({
  gameId,
  groupId,
  userId,
  userOwns,
  ownershipId,
  wantsToPlay,
}: Props) {
  return (
    <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md">
      <div className="space-y-2">
        <OwnGameButton
          gameId={gameId}
          userOwns={userOwns}
          ownershipId={ownershipId}
        />
        <WantToPlayButton
          gameId={gameId}
          groupId={groupId}
          userId={userId}
          wantsToPlay={wantsToPlay}
        />
        <Link
          href={`/plays/new?game=${gameId}`}
          className="btn-secondary pressable flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-medium hover:bg-surface-2"
        >
          <Play className="h-4 w-4" />
          Log a play
        </Link>
      </div>
    </div>
  );
}
