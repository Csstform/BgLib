import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_LIBRARY_FILTERS } from "@/lib/library-filters";
import {
  DEFAULT_LIBRARY_VIEW_STATE,
  libraryViewStorageKey,
  loadLibraryViewState,
  normalizeLibraryViewState,
  saveLibraryViewState,
} from "@/lib/library-view-state";

const memory = new Map<string, string>();

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      clear: () => memory.clear(),
    },
  });
});

afterEach(() => {
  memory.clear();
});

describe("normalizeLibraryViewState", () => {
  it("returns defaults for invalid payloads", () => {
    expect(normalizeLibraryViewState(null)).toEqual(DEFAULT_LIBRARY_VIEW_STATE);
    expect(normalizeLibraryViewState("nope")).toEqual(DEFAULT_LIBRARY_VIEW_STATE);
  });

  it("migrates the old I-own flag onto ownerId", () => {
    const state = normalizeLibraryViewState(
      {
        search: "catan",
        viewMode: "flat",
        filters: { ownedByMeOnly: true, unplayedOnly: true },
      },
      "user-1"
    );
    expect(state.search).toBe("catan");
    expect(state.viewMode).toBe("flat");
    expect(state.filters.ownerId).toBe("user-1");
    expect(state.filters.unplayedOnly).toBe(true);
  });

  it("keeps no-owners exclusive of a selected owner", () => {
    const state = normalizeLibraryViewState({
      filters: { ownerId: "user-1", noOwnersOnly: true },
    });
    expect(state.filters.ownerId).toBeNull();
    expect(state.filters.noOwnersOnly).toBe(true);
  });
});

describe("library view session storage", () => {
  it("round-trips search, view mode, and filters per group", () => {
    saveLibraryViewState("group-a", {
      search: "wingspan",
      viewMode: "flat",
      filters: { ...DEFAULT_LIBRARY_FILTERS, maxPlayTime: 45 },
    });

    expect(loadLibraryViewState("group-b")).toBeNull();
    expect(loadLibraryViewState("group-a")).toEqual({
      search: "wingspan",
      viewMode: "flat",
      filters: { ...DEFAULT_LIBRARY_FILTERS, maxPlayTime: 45 },
    });
    expect(sessionStorage.getItem(libraryViewStorageKey("group-a"))).toContain(
      "wingspan"
    );
  });
});
