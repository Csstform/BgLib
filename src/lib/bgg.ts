import { XMLParser } from "fast-xml-parser";

const BGG_BASE = "https://boardgamegeek.com/xmlapi2";

export type BggSearchResult = {
  id: number;
  name: string;
  yearPublished?: number;
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
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) =>
    ["item", "name", "link", "poll", "result", "item"].includes(name),
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

function getPrimaryName(names: unknown): string {
  if (!names) return "Unknown";
  const list = Array.isArray(names) ? names : [names];
  const primary = list.find(
    (n: { "@_type"?: string }) => n["@_type"] === "primary"
  );
  const chosen = primary ?? list[0];
  if (typeof chosen === "string") return chosen;
  return chosen?.["@_value"] ?? chosen?.["#text"] ?? "Unknown";
}

export async function searchBggGames(query: string): Promise<BggSearchResult[]> {
  if (!query.trim()) return [];

  const xml = await fetchBgg(
    `/search?query=${encodeURIComponent(query)}&type=boardgame`
  );
  const parsed = parser.parse(xml);
  const items = parsed?.items?.item;

  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];

  return list
    .filter((item: { "@_type"?: string }) => item["@_type"] === "boardgame")
    .slice(0, 15)
    .map((item: { "@_id": string; name?: { "@_value": string }; yearpublished?: { "@_value": string } }) => ({
      id: parseInt(item["@_id"], 10),
      name: typeof item.name === "object" ? item.name["@_value"] : String(item.name ?? ""),
      yearPublished: item.yearpublished
        ? parseInt(item.yearpublished["@_value"], 10)
        : undefined,
    }));
}

export async function getBggGameDetails(
  id: number
): Promise<BggGameDetails | null> {
  const xml = await fetchBgg(`/thing?id=${id}&stats=1`);
  const parsed = parser.parse(xml);
  const item = parsed?.items?.item;

  if (!item) return null;

  const game = Array.isArray(item) ? item[0] : item;
  const desc = game.description ?? "";
  const cleanDesc = desc
    .replace(/<[^>]+>/g, "")
    .replace(/&#10;/g, "\n")
    .trim();

  const minPlayers = parseInt(game.minplayers?.["@_value"] ?? "1", 10);
  const maxPlayers = game.maxplayers?.["@_value"]
    ? parseInt(game.maxplayers["@_value"], 10)
    : null;

  const minTime = game.minplaytime?.["@_value"]
    ? parseInt(game.minplaytime["@_value"], 10)
    : null;
  const maxTime = game.maxplaytime?.["@_value"]
    ? parseInt(game.maxplaytime["@_value"], 10)
    : null;
  const playTimeMinutes = maxTime ?? minTime;

  const imageUrl =
    game.image?.["@_value"] ?? game.thumbnail?.["@_value"] ?? null;

  return {
    id,
    name: getPrimaryName(game.name),
    description: cleanDesc,
    minPlayers,
    maxPlayers,
    playTimeMinutes,
    imageUrl,
    yearPublished: game.yearpublished?.["@_value"]
      ? parseInt(game.yearpublished["@_value"], 10)
      : undefined,
  };
}

export type BggCollectionItem = {
  id: number;
  name: string;
  owned: boolean;
  yearPublished?: number;
};

export async function getBggCollection(
  username: string
): Promise<BggCollectionItem[]> {
  const xml = await fetchBgg(
    `/collection?username=${encodeURIComponent(username)}&own=1&stats=1&subtype=boardgame`
  );
  const parsed = parser.parse(xml);
  const items = parsed?.items?.item;

  if (!items) return [];

  const list = Array.isArray(items) ? items : [items];

  return list.map(
    (item: {
      "@_objectid": string;
      name?: { "@_value": string };
      yearpublished?: { "@_value": string };
      status?: { "@_own": string };
    }) => ({
      id: parseInt(item["@_objectid"], 10),
      name: typeof item.name === "object" ? item.name["@_value"] : String(item.name ?? ""),
      owned: item.status?.["@_own"] === "1",
      yearPublished: item.yearpublished
        ? parseInt(item.yearpublished["@_value"], 10)
        : undefined,
    })
  );
}

export function isBggConfigured(): boolean {
  return !!process.env.BGG_API_TOKEN?.trim();
}
