import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    href: string;
    label: string;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center py-12 px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="h-7 w-7" />
      </div>
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted max-w-xs">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="btn-primary mt-5 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
