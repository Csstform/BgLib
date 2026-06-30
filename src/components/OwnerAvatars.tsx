import { getInitials } from "@/lib/utils";
import type { OwnerInfo } from "@/lib/types";

type Props = {
  owners: OwnerInfo[];
  max?: number;
  size?: "sm" | "md";
};

export function OwnerAvatars({ owners, max = 4, size = "md" }: Props) {
  const shown = owners.slice(0, max);
  const extra = owners.length - max;
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-xs";

  return (
    <div className="flex -space-x-1.5">
      {shown.map((owner) => (
        <div
          key={owner.user_id}
          title={owner.display_name}
          className={`${dim} flex items-center justify-center rounded-full border-2 border-surface bg-primary/20 font-medium text-primary shrink-0 overflow-hidden`}
        >
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
      ))}
      {extra > 0 && (
        <div
          className={`${dim} flex items-center justify-center rounded-full border-2 border-surface bg-surface-2 font-medium text-muted shrink-0`}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
