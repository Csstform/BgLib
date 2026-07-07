import { XMLParser } from "fast-xml-parser";
import {
  cleanBggDescription,
  decodeHtmlEntities,
} from "@/lib/decode-html-entities";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";

export type BggItemType = "boardgame" | "boardgameexpansion";

export type BggSearchResult = {
  id: number;
  name: string;
  yearPublished?: number;
  type: BggItemType;
};

export type BggLinkRef = {
  id: number;
  name: string;
};

export type BggGameDetails = {
  id: number;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  imageUrl: string | null;
  yearPublished?: number;
  bggType: BggItemType;
  baseGameBggId: number | null;
  expansionBggIds: BggLinkRef[];
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["item", "name", "link", "poll", "result"].includes(name),
});

function getBggToken(): string {
  const token = process.env.BGG_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "BGG API token is not configured. Register at https://boardgamegeek.com/applications, create a token, and set BGG_API_TOKEN in .env.local"
    );
  }
  return token;
}

function assertXmlResponse(body: string, status: number): void {
  const trimmed = body.trimStart();

  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(
      "BGG returned an HTML error page. Check that BGG_API_TOKEN is valid."
    );
  }

  if (status === 401 || status === 403 || trimmed.includes("Unauthorized")) {
    throw new Error(
      "BGG API unauthorized. Register at https://boardgamegeek.com/applications and set a valid BGG_API_TOKEN in .env.local"
    );
  }

  if (!trimmed.startsWith("<?xml") && !trimmed.startsWith("<")) {
    throw new Error(
      trimmed.slice(0, 120) || "Unexpected response from BGG API"
    );
  }
}

async function fetchBgg(path: string): Promise<string> {
  const headers: Record<string, string> = {
    Accept: "application/xml",
    Authorization: `Bearer ${getBggToken()}`,
    "User-Agent": "BgLib/1.0 (board game library app)",
  };

  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${BGG_BASE}${path}`, {
      headers,
      cache: "no-store",
    });

    if (res.status === 202) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }

    const text = await res.text();

    if (!res.ok) {
      assertXmlResponse(text, res.status);
      throw new Error(`BGG API error: ${res.status}`);
    }

    assertXmlResponse(text, res.status);
    return text;
  }

  throw new Error("BGG API timed out — try again in a moment");
}

function decodeText(value: string): string {
  return decodeHtmlEntities(value.trim());
}

function getAttrValue(node: unknown): string | undefined {
  if (node == null) return undefined;
  if (typeof node === "string" || typeof node === "number") {
    const s = decodeText(String(node));
    return s || undefined;
  }
  if (Array.isArray(node)) {
    for (const entry of node) {
      const val = getAttrValue(entry);
      if (val) return val;
    }
    return undefined;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj["@_value"] === "string") return decodeText(obj["@_value"]);
    if (typeof obj["#text"] === "string") return decodeText(obj["#text"]);
  }
  return undefined;
}

function parseYearPublished(node: unknown): number | undefined {
  const raw = getAttrValue(node);
  if (!raw) return undefined;
  const year = parseInt(raw, 10);
  return Number.isFinite(year) ? year : undefined;
}

function getPrimaryName(names: unknown): string {
  if (!names) return "Unknown";
  const list = Array.isArray(names) ? names : [names];
  const primary = list.find(
    (n: { "@_type"?: string }) => n["@_type"] === "primary"
  );
  const chosen = primary ?? list[0];
  if (typeof chosen === "string") return decodeText(chosen);
  const raw = chosen?.["@_value"] ?? chosen?.["#text"];
  return raw ? decodeText(String(raw)) : "Unknown";
}

function parseBggLinks(
  links: unknown,
  type: string
): BggLinkRef[] {
  if (!links) return [];
  const list = Array.isArray(links) ? links : [links];
  return list
    .filter((l: { "@_type"?: string }) => l["@_type"] === type)
    .map((l: { "@_id"?: string; "@_value"?: string }) => ({
      id: parseInt(l["@_id"] ?? "0", 10),
      name: l["@_value"] ? decodeText(l["@_value"]) : "Unknown",
    }))
    .filter((l) => l.id > 0);
}

function parseThingItem(game: Record<string, unknown>, id: number): BggGameDetails {
  const desc = (game.description as string) ?? "";
  const cleanDesc = cleanBggDescription(desc);

  const minPlayers = parseInt(getAttrValue(game.minplayers) ?? "1", 10);
  const maxPlayersRaw = getAttrValue(game.maxplayers);
  const maxPlayers = maxPlayersRaw ? parseInt(maxPlayersRaw, 10) : null;

  const minTimeRaw = getAttrValue(game.minplaytime);
  const maxTimeRaw = getAttrValue(game.maxplaytime);
  const minTime = minTimeRaw ? parseInt(minTimeRaw, 10) : null;
  const maxTime = maxTimeRaw ? parseInt(maxTimeRaw, 10) : null;

  const imageUrl =
    getAttrValue(game.image) ?? getAttrValue(game.thumbnail) ?? null;

  const rawType = (game["@_type"] as string) ?? "boardgame";
  const bggType: BggItemType =
    rawType === "boardgameexpansion" ? "boardgameexpansion" : "boardgame";

  const expansionLinks = parseBggLinks(game.link, "boardgameexpansion");
  const baseLinks = parseBggLinks(game.link, "boardgame");

  return {
    id,
    name: getPrimaryName(game.name),
    description: cleanDesc,
    minPlayers,
    maxPlayers,
    playTimeMinutes: maxTime ?? minTime,
    imageUrl,
    yearPublished: parseYearPublished(game.yearpublished),
    bggType,
    baseGameBggId:
      bggType === "boardgameexpansion" && baseLinks[0] ? baseLinks[0].id : null,
    expansionBggIds: bggType === "boardgame" ? expansionLinks : [],
  };
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  if (!query.trim()) return [];

  const xml = await fetchBgg(
    `/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion`
  );
  const parsed = parser.parse(xml);
  const items = parsed?.items?.item;

  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];

  return list
    .filter((item: { "@_type"?: string }) =>
      ["boardgame", "boardgameexpansion"].includes(item["@_type"] ?? "")
    )
    .slice(0, 20)
    .map(
      (item: {
        "@_id": string;
        "@_type"?: string;
        name?: unknown;
        yearpublished?: unknown;
      }) => ({
        id: parseInt(item["@_id"], 10),
        name: getPrimaryName(item.name),
        yearPublished: parseYearPublished(item.yearpublished),
        type:
          item["@_type"] === "boardgameexpansion"
            ? "boardgameexpansion"
            : "boardgame",
      })
    );
}

export async function getBggGameDetails(
  id: number
): Promise<BggGameDetails | null> {
  const xml = await fetchBgg(`/thing?id=${id}&stats=1`);
  const parsed = parser.parse(xml);
  const item = parsed?.items?.item;

  if (!item) return null;

  const game = Array.isArray(item) ? item[0] : item;
  return parseThingItem(game as Record<string, unknown>, id);
}

export type BggCollectionItem = {
  id: number;
  name: string;
  owned: boolean;
  yearPublished?: number;
  subtype: BggItemType;
};

async function fetchBggCollectionSubtype(
  username: string,
  subtype: "boardgame" | "boardgameexpansion"
): Promise<BggCollectionItem[]> {
  const xml = await fetchBgg(
    `/collection?username=${encodeURIComponent(username)}&own=1&stats=1&subtype=${subtype}`
  );
  const parsed = parser.parse(xml);
  const items = parsed?.items?.item;

  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];

  return list.map(
    (item: {
      "@_objectid": string;
      name?: unknown;
      yearpublished?: unknown;
      status?: { "@_own": string };
    }) => ({
      id: parseInt(item["@_objectid"], 10),
      name: getPrimaryName(item.name),
      owned: item.status?.["@_own"] === "1",
      yearPublished: parseYearPublished(item.yearpublished),
      subtype,
    })
  );
}

export async function getBggCollection(
  username: string
): Promise<BggCollectionItem[]> {
  const [games, expansions] = await Promise.all([
    fetchBggCollectionSubtype(username, "boardgame"),
    fetchBggCollectionSubtype(username, "boardgameexpansion"),
  ]);
  return [...games, ...expansions];
}

export function isBggConfigured(): boolean {
  return !!process.env.BGG_API_TOKEN?.trim();
}
