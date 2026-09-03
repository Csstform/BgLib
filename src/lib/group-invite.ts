export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function groupJoinPath(inviteCode: string): string {
  return `/join/${encodeURIComponent(normalizeInviteCode(inviteCode))}`;
}

export function groupJoinUrl(origin: string, inviteCode: string): string {
  return `${origin.replace(/\/$/, "")}${groupJoinPath(inviteCode)}`;
}
