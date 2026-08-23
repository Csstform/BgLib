const CONDITIONS = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
} as const;

export function formatCondition(condition: string): string {
  return CONDITIONS[condition as keyof typeof CONDITIONS] ?? condition;
}

export function formatPlayTime(minutes: number | null): string {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatPlayers(min: number, max: number | null): string {
  if (!max || min === max) return `${min}`;
  return `${min}–${max}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Format a date for `<input type="datetime-local">` in the user's local timezone. */
export function toDatetimeLocalValue(date: Date | string = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

/** Convert a datetime-local input value to an ISO string (run on the client). */
export function datetimeLocalToIso(localValue: string): string {
  const match = DATETIME_LOCAL_RE.exec(localValue);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
  }

  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid datetime-local value");
  }
  return date.toISOString();
}

/** Parse an ISO datetime from the client, rejecting bare datetime-local strings. */
export function parseClientIsoDateTime(value: string): Date | null {
  if (DATETIME_LOCAL_RE.test(value)) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatLoanStatus(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending approval",
    active: "On loan",
    returned: "Returned",
    declined: "Declined",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

export function formatRsvpStatus(status: string): string {
  const labels: Record<string, string> = {
    going: "Going",
    maybe: "Maybe",
    declined: "Can't make it",
  };
  return labels[status] ?? status;
}
