import type { GameUpcCandidate } from "@/lib/types";

export type BarcodeLookupResult = {
  upc: string;
  bggId: number | null;
  name?: string;
  productName?: string;
  productSource?: string;
  source:
    | "library"
    | "cache"
    | "gameupc"
    | "bgg_search"
    | "manual";
  candidates: GameUpcCandidate[];
  needsManualSearch: boolean;
  message?: string;
};

/** Choose a barcode lookup outcome from a product name + BGG search hits. */
export function barcodeResultFromBggSearch(
  upc: string,
  product: { title: string; source?: string },
  candidates: GameUpcCandidate[]
): BarcodeLookupResult {
  if (candidates.length === 0) {
    return {
      upc,
      bggId: null,
      productName: product.title,
      productSource: product.source,
      source: "manual",
      candidates: [],
      needsManualSearch: true,
      message: `Found "${product.title}" on the box but no BGG match. Search BGG manually.`,
    };
  }

  if (candidates.length === 1) {
    return {
      upc,
      bggId: candidates[0].bggId,
      name: candidates[0].name,
      productName: product.title,
      productSource: product.source,
      source: "bgg_search",
      candidates,
      needsManualSearch: false,
    };
  }

  return {
    upc,
    bggId: null,
    productName: product.title,
    productSource: product.source,
    source: "bgg_search",
    candidates,
    needsManualSearch: false,
    message: `Matched "${product.title}" — pick the correct game:`,
  };
}
