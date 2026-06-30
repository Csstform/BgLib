import Link from "next/link";
import { formatCondition } from "@/lib/utils";
import type { OwnerInfo } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { BorrowButton } from "./BorrowButton";

type Props = {
  owner: OwnerInfo;
  gameId?: string;
  currentUserId?: string;
  hasActiveLoan?: boolean;
};

export function OwnerRow({
  owner,
  gameId,
  currentUserId,
  hasActiveLoan,
}: Props) {
  const showBorrow =
    gameId && currentUserId && currentUserId !== owner.user_id;

  return (
    <div className="flex items-start gap-3 rounded-lg p-2 hover:bg-surface-2 transition-colors">
      <Link
        href={`/users/${owner.user_id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-medium text-primary overflow-hidden shrink-0">
          {owner.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={owner.avatar_url}
              alt={owner.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(owner.display_name)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{owner.display_name}</p>
          <p className="text-sm text-muted">
            {formatCondition(owner.condition)}
            {owner.notes ? ` · ${owner.notes}` : ""}
          </p>
        </div>
      </Link>
      {showBorrow && (
        <BorrowButton
          gameId={gameId}
          lenderId={owner.user_id}
          lenderName={owner.display_name}
          currentUserId={currentUserId}
          hasActiveLoan={hasActiveLoan ?? false}
        />
      )}
    </div>
  );
}
