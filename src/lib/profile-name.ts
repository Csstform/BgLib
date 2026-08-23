export type NameFields = {
  display_name?: string | null;
  real_name?: string | null;
};

/** Public name: real name when set, otherwise username. */
export function profileName(
  profile?: NameFields | null,
  fallback = "Someone"
): string {
  const real = profile?.real_name?.trim();
  if (real) return real;
  const username = profile?.display_name?.trim();
  if (username) return username;
  return fallback;
}

export function profileUsername(profile?: NameFields | null): string {
  return profile?.display_name?.trim() ?? "";
}
