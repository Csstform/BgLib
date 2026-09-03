import { describe, expect, it } from "vitest";
import { parseAverageWeight } from "@/lib/bgg";

describe("parseAverageWeight", () => {
  it("reads averageweight from BGG statistics", () => {
    expect(
      parseAverageWeight({
        statistics: {
          ratings: { averageweight: { "@_value": "2.54321" } },
        },
      })
    ).toBe(2.54);
  });

  it("returns null for missing or zero weight", () => {
    expect(parseAverageWeight({})).toBeNull();
    expect(
      parseAverageWeight({
        statistics: { ratings: { averageweight: { "@_value": "0" } } },
      })
    ).toBeNull();
  });
});
