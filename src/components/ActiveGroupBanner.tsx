import Link from "next/link";
import { Users } from "lucide-react";

export function ActiveGroupBanner({
  groupName,
  action,
}: {
  groupName: string;
  action: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-muted">
        {action}{" "}
        <span className="font-medium text-foreground">{groupName}</span>. Switch
        groups in the header if this isn&apos;t the right library.{" "}
        <Link href="/profile#group" className="text-primary hover:underline">
          Manage groups
        </Link>
      </p>
    </div>
  );
}
