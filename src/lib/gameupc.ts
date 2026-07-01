import { barcodeLookupVariants } from "@/lib/barcode";
import type { GameUpcCandidate } from "@/lib/types";

const GAMEUPC_BASE = "https://api.gameupc.com/upc";

export type GameUpcLookupResult = {
  bggId: number | null;
  name?: string;
  status?: string;
  candidates: GameUpcCandidate[];
};

function getGameUpcToken(): string {
  const token = process.env.GAMEUPC_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "GameUPC API token is not configured. Register at https://gameupc.com and set GAMEUPC_API_TOKEN in .env.local"
    );
  }
  return token;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) return parseInt(value, 10);
  return null;
}

function parseCandidate(entry: unknown): GameUpcCandidate | null {
  if (!entry || typeof entry !== "object") return null;
  const obj = entry as Record<string, unknown>;
  const bggId = asNumber(
    obj.bgg_id ?? obj.bggId ?? obj.bggID ?? obj.id ?? obj.objectid
  );
  if (!bggId) return null;

  const name =
    (typeof obj.name === "string" && obj.name) ||
    (typeof obj.title === "string" && obj.title) ||
    undefined;

  const status =
    (typeof obj.status === "string" && obj.status) ||
    (typeof obj.verification === "string" && obj.verification) ||
    undefined;

  return { bggId, name, status };
}

function parseGameUpcResponse(data: unknown): GameUpcLookupResult {
  if (!data || typeof data !== "object") {
    return { bggId: null, candidates: [] };
  }

  const obj = data as Record<string, unknown>;

  const candidateLists = [
    obj.candidates,
    obj.suggestions,
    obj.alternatives,
    obj.games,
    obj.items,
    obj.results,
  ];

  const candidates: GameUpcCandidate[] = [];
  for (const list of candidateLists) {
    if (!Array.isArray(list)) continue;
    for (const entry of list) {
      const parsed = parseCandidate(entry);
      if (parsed) candidates.push(parsed);
    }
  }

  const nestedGame =
    obj.game && typeof obj.game === "object"
      ? (obj.game as Record<string, unknown>)
      : null;

  const directBggId = asNumber(
    obj.bgg_id ??
      obj.bggId ??
      obj.bggID ??
      nestedGame?.bgg_id ??
      nestedGame?.bggId ??
      nestedGame?.id
  );

  const name =
    (typeof obj.name === "string" && obj.name) ||
    (typeof obj.title === "string" && obj.title) ||
    (typeof nestedGame?.name === "string" && nestedGame.name) ||
    undefined;

  const status =
    (typeof obj.status === "string" && obj.status) ||
    (typeof obj.verification === "string" && obj.verification) ||
    undefined;

  if (directBggId && candidates.length === 0) {
    return { bggId: directBggId, name, status, candidates: [] };
  }

  if (directBggId) {
    const hasDirect = candidates.some((c) => c.bggId === directBggId);
    if (!hasDirect) {
      candidates.unshift({ bggId: directBggId, name, status });
    }
  }

  const primary =
    candidates.find((c) => c.status === "verified") ??
    candidates[0] ??
    (directBggId ? { bggId: directBggId, name, status } : null);

  return {
    bggId: primary?.bggId ?? null,
    name: primary?.name ?? name,
    status: primary?.status ?? status,
    candidates,
  };
}

export function isGameUpcConfigured(): boolean {
  return !!process.env.GAMEUPC_API_TOKEN?.trim();
}

export async function lookupUpcOnGameUpc(
  rawUpc: string
): Promise<GameUpcLookupResult | null> {
  const token = getGameUpcToken();
  const variants = barcodeLookupVariants(rawUpc);

  for (const upc of variants) {
    const res = await fetch(`${GAMEUPC_BASE}/${encodeURIComponent(upc)}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "BgLib/1.0 (board game library app)",
      },
      cache: "no-store",
    });

    if (res.status === 404) continue;

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : `GameUPC error: ${res.status}`;
      throw new Error(message);
    }

    const parsed = parseGameUpcResponse(body);
    if (parsed.bggId || parsed.candidates.length > 0) {
      return parsed;
    }
  }

  return null;
}
