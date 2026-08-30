import { describe, expect, it } from "vitest";
import {
  barcodeLookupVariants,
  normalizeBarcode,
} from "@/lib/barcode";
import { barcodeResultFromBggSearch } from "@/lib/barcode-match";

describe("normalizeBarcode", () => {
  it("keeps 12-digit UPC digits", () => {
    expect(normalizeBarcode("711719577966")).toBe("711719577966");
  });

  it("strips spaces and punctuation", () => {
    expect(normalizeBarcode("7 11719-57796 6")).toBe("711719577966");
  });

  it("rejects too-short values", () => {
    expect(normalizeBarcode("1234567")).toBeNull();
  });
});

describe("barcodeLookupVariants", () => {
  it("adds a leading zero for UPC-A", () => {
    expect(barcodeLookupVariants("711719577966")).toEqual([
      "711719577966",
      "0711719577966",
    ]);
  });

  it("strips a leading zero from EAN-13", () => {
    expect(barcodeLookupVariants("0711719577966")).toEqual([
      "0711719577966",
      "711719577966",
    ]);
  });
});

describe("barcodeResultFromBggSearch", () => {
  it("asks for manual search when BGG has no hits", () => {
    const result = barcodeResultFromBggSearch(
      "711719577966",
      { title: "Catan", source: "openfoodfacts" },
      []
    );
    expect(result.needsManualSearch).toBe(true);
    expect(result.source).toBe("manual");
    expect(result.bggId).toBeNull();
  });

  it("auto-selects a single BGG match", () => {
    const result = barcodeResultFromBggSearch(
      "711719577966",
      { title: "Catan" },
      [{ bggId: 13, name: "Catan (1995)" }]
    );
    expect(result.needsManualSearch).toBe(false);
    expect(result.bggId).toBe(13);
    expect(result.source).toBe("bgg_search");
  });

  it("returns candidates when several games match", () => {
    const result = barcodeResultFromBggSearch(
      "711719577966",
      { title: "Catan" },
      [
        { bggId: 13, name: "Catan (1995)" },
        { bggId: 99, name: "Catan Junior" },
      ]
    );
    expect(result.bggId).toBeNull();
    expect(result.candidates).toHaveLength(2);
    expect(result.message).toMatch(/pick the correct game/);
  });
});
