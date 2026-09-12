"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_LIBRARY_FILTERS,
  NO_OWNERS_FILTER_VALUE,
  hasActiveLibraryFilters,
  type LibraryFilters,
} from "@/lib/library-filters";
import type { OwnerInfo } from "@/lib/types";

type Props = {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  owners: OwnerInfo[];
};

export function LibraryFiltersPanel({ filters, onChange, owners }: Props) {
  const [open, setOpen] = useState(false);
  const active = hasActiveLibraryFilters(filters);
  const activeCount = [
    filters.ownerId || filters.noOwnersOnly,
    filters.minPlayers,
    filters.maxPlayers,
    filters.maxPlayTime,
    filters.unplayedOnly,
    filters.maxWeight,
  ].filter(Boolean).length;

  const ownershipValue = filters.noOwnersOnly
    ? NO_OWNERS_FILTER_VALUE
    : (filters.ownerId ?? "");

  const selectClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div className="contents">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`order-2 pressable flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted"
        }`}
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="order-4 basis-full rounded-xl border border-border bg-surface p-4 space-y-3 animate-dropdown">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Owner
            </label>
            <select
              value={ownershipValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === NO_OWNERS_FILTER_VALUE) {
                  onChange({
                    ...filters,
                    ownerId: null,
                    noOwnersOnly: true,
                  });
                  return;
                }
                onChange({
                  ...filters,
                  ownerId: value || null,
                  noOwnersOnly: false,
                });
              }}
              className={selectClass}
            >
              <option value="">Any owner</option>
              <option value={NO_OWNERS_FILTER_VALUE}>No owners</option>
              {owners.map((o) => (
                <option key={o.user_id} value={o.user_id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Min players
              </label>
              <input
                type="number"
                min={1}
                value={filters.minPlayers ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    minPlayers: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                className={selectClass}
                placeholder="Any"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Max players
              </label>
              <input
                type="number"
                min={1}
                value={filters.maxPlayers ?? ""}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    maxPlayers: e.target.value
                      ? parseInt(e.target.value, 10)
                      : null,
                  })
                }
                className={selectClass}
                placeholder="Any"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Max complexity (BGG weight)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              step={0.5}
              value={filters.maxWeight ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxWeight: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className={selectClass}
              placeholder="Any (1–5)"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Max play time (min)
            </label>
            <input
              type="number"
              min={15}
              value={filters.maxPlayTime ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  maxPlayTime: e.target.value
                    ? parseInt(e.target.value, 10)
                    : null,
                })
              }
              className={selectClass}
              placeholder="Any"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.unplayedOnly}
              onChange={(e) =>
                onChange({ ...filters, unplayedOnly: e.target.checked })
              }
              className="accent-primary"
            />
            Never played
          </label>

          {active && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_LIBRARY_FILTERS)}
              className="text-xs text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
