import { describe, expect, it } from "vitest";
import { detectPwaPlatform } from "@/lib/pwa-platform";

describe("detectPwaPlatform", () => {
  it("detects iPhone Safari", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "iPhone",
        5
      )
    ).toBe("ios");
  });

  it("detects iPadOS desktop UA with touch", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "MacIntel",
        5
      )
    ).toBe("ios");
  });

  it("detects Android", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36",
        "Linux armv8l",
        5
      )
    ).toBe("android");
  });

  it("falls back to desktop", () => {
    expect(
      detectPwaPlatform(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "MacIntel",
        0
      )
    ).toBe("desktop");
  });
});
