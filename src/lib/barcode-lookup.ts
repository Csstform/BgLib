import { isBggConfigured, searchBggGames } from "@/lib/bgg";
import { isGameUpcConfigured, lookupUpcOnGameUpc } from "@/lib/gameupc";
import { lookupUpcProductName } from "@/lib/upc-product-lookup";
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

function bggResultsToCandidates(
  results: Awaited<ReturnType<typeof searchBggGames>>
): GameUpcCandidate[] {
  return results.map((r) => ({
    bggId: r.id,
    name: r.yearPublished ? `${r.name} (${r.yearPublished})` : r.name,
    status: r.type === "boardgameexpansion" ? "expansion" : undefined,
  }));
}

export async function resolveBarcodeToBgg(
  upc: string
): Promise<BarcodeLookupResult> {
  if (isGameUpcConfigured()) {
    try {
      const gameUpc = await lookupUpcOnGameUpc(upc);
      if (gameUpc?.bggId) {
        return {
          upc,
          bggId: gameUpc.bggId,
          name: gameUpc.name,
          source: "gameupc",
          candidates: gameUpc.candidates,
          needsManualSearch: false,
        };
      }
      if (gameUpc && gameUpc.candidates.length > 0) {
        return {
          upc,
          bggId: null,
          source: "gameupc",
          candidates: gameUpc.candidates,
          needsManualSearch: false,
        };
      }
    } catch {
      // Fall through to free lookup + BGG search
    }
  }

  if (!isBggConfigured()) {
    return {
      upc,
      bggId: null,
      source: "manual",
      candidates: [],
      needsManualSearch: true,
      message:
        "BGG_API_TOKEN is required to match barcodes to games. Search BGG below, and we'll remember this barcode for next time.",
    };
  }

  const product = await lookupUpcProductName(upc);

  if (!product?.title) {
    return {
      upc,
      bggId: null,
      source: "manual",
      candidates: [],
      needsManualSearch: true,
      message:
        "No product name found for this barcode. Search BGG below — we'll save the link for your group.",
    };
  }

  const searchQuery = product.title;
  const bggResults = await searchBggGames(searchQuery);
  const candidates = bggResultsToCandidates(bggResults);

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
