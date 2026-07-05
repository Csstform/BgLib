import type { DuplicateMatch } from "@/lib/types";

export type DuplicateCluster = {
  id: string;
  match_type: DuplicateMatch["match_type"];
  label: string;
  games: { id: string; title: string; bgg_id: number | null }[];
};

type GameRow = {
  id: string;
  title: string;
  bgg_id: number | null;
  upc?: string | null;
};

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

function addCluster(
  clusters: DuplicateCluster[],
  usedIds: Set<string>,
  match_type: DuplicateCluster["match_type"],
  label: string,
  games: GameRow[]
) {
  if (games.length < 2) return;
  const ids = games.map((g) => g.id).sort().join(",");
  if (clusters.some((c) => c.id === ids)) return;
  for (const g of games) usedIds.add(g.id);
  clusters.push({
    id: ids,
    match_type,
    label,
    games: games.map((g) => ({
      id: g.id,
      title: g.title,
      bgg_id: g.bgg_id,
    })),
  });
}

/** Find groups of 2+ catalogue entries that likely represent the same game. */
export function findDuplicateClusters(games: GameRow[]): DuplicateCluster[] {
  const clusters: DuplicateCluster[] = [];
  const usedInCluster = new Set<string>();

  const byBgg = new Map<number, GameRow[]>();
  for (const g of games) {
    if (!g.bgg_id) continue;
    const list = byBgg.get(g.bgg_id) ?? [];
    list.push(g);
    byBgg.set(g.bgg_id, list);
  }
  for (const [bggId, group] of byBgg) {
    addCluster(
      clusters,
      usedInCluster,
      "bgg_id",
      `Same BGG ID (${bggId})`,
      group
    );
  }

  const byUpc = new Map<string, GameRow[]>();
  for (const g of games) {
    if (!g.upc?.trim()) continue;
    const list = byUpc.get(g.upc) ?? [];
    list.push(g);
    byUpc.set(g.upc, list);
  }
  for (const [upc, group] of byUpc) {
    const fresh = group.filter((g) => !usedInCluster.has(g.id));
    if (fresh.length < 2) continue;
    addCluster(clusters, usedInCluster, "upc", `Same barcode (${upc})`, fresh);
  }

  const byTitle = new Map<string, GameRow[]>();
  for (const g of games) {
    const key = normalizeTitle(g.title);
    if (key.length < 3) continue;
    const list = byTitle.get(key) ?? [];
    list.push(g);
    byTitle.set(key, list);
  }
  for (const [, group] of byTitle) {
    const fresh = group.filter((g) => !usedInCluster.has(g.id));
    if (fresh.length < 2) continue;
    addCluster(
      clusters,
      usedInCluster,
      "title",
      `Same title (“${fresh[0].title}”)`,
      fresh
    );
  }

  return clusters.sort((a, b) => a.label.localeCompare(b.label));
}
