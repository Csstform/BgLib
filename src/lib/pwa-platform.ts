export type PwaPlatform = "ios" | "android" | "desktop";

export function detectPwaPlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number
): PwaPlatform {
  const iOS =
    /iPad|iPhone|iPod/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "desktop";
}
