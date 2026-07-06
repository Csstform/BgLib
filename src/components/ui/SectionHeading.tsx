import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
};

export function SectionHeading({ icon: Icon, title, action }: Props) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-semibold">
        {Icon && <Icon className="h-5 w-5 text-muted" />}
        {title}
      </h2>
      {action}
    </div>
  );
}
