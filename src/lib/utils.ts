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
