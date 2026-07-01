import type { GameWithOwners } from "@/lib/types";

const DB_NAME = "bglib-offline";
const DB_VERSION = 1;
const STORE = "libraries";

type CachedLibrary = {
  groupId: string;
  games: GameWithOwners[];
  cachedAt: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "groupId" });
      }
    };
  });
}

export async function cacheLibrary(
  groupId: string,
  games: GameWithOwners[]
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      groupId,
      games,
      cachedAt: new Date().toISOString(),
    } satisfies CachedLibrary);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedLibrary(
  groupId: string
): Promise<CachedLibrary | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(groupId);
    request.onsuccess = () => resolve((request.result as CachedLibrary) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
