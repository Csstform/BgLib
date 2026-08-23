"use client";

import { useSyncExternalStore } from "react";
import { formatDateTime } from "@/lib/utils";

function subscribe() {
  return () => {};
}

/** Format an ISO timestamp in the viewer's local timezone (not the server's). */
export function LocalDateTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const label = useSyncExternalStore(
    subscribe,
    () => formatDateTime(iso),
    () => ""
  );

  return (
    <time dateTime={iso} className={className}>
      {label || "\u00a0"}
    </time>
  );
}
