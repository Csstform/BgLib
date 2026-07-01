"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import type { LibraryFilters } from "@/lib/library-filters";
import type { OwnerInfo } from "@/lib/types";

type Props = {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  owners: OwnerInfo[];
  userId?: string;
};

export function LibraryFiltersPanel({
  filters,
  onChange,
  owners,
  userId,
}: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.ownerId,
    filters.minPlayers,
    filters.maxPlayers,
    filters.maxPlayTime,
    filters.unplayedOnly,
    filters.ownedByMeOnly,
    filters.noOwnersOnly,
  ].filter(Boolean).length;

  const selectClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`pressable flex items-center gap-2 rounded-xl border px-3 py-2 text-sm shrink-0 ${
          activeCount > 0
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-surface text-muted"
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters{activeCount > 0 ? ` (${activeCount})` : ""}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-border bg-surface p-4 space-y-3 animate-dropdown">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Owner
            </label>
            <select
              value={filters.ownerId ?? ""}
              onChange={(e) =>
                onChange({
                  ...filters,
                  ownerId: e.target.value || null,
                  ownedByMeOnly: false,
                })
              }
              className={selectClass}
            >
              <option value="">Any owner</option>
              {owners.map((o) => (
                <option key={o.user_id} value={o.user_id}>
                  {o.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
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
              <label className="block text-xs font-medium text-muted mb-1">
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
            <label className="block text-xs font-medium text-muted mb-1">
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

          <div className="flex flex-wrap gap-3">
            {userId && (
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.ownedByMeOnly}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      ownedByMeOnly: e.target.checked,
                      ownerId: e.target.checked ? null : filters.ownerId,
                    })
                  }
                  className="accent-primary"
                />
                I own
              </label>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={filters.noOwnersOnly}
                onChange={(e) =>
                  onChange({ ...filters, noOwnersOnly: e.target.checked })
                }
                className="accent-primary"
              />
              No owners
            </label>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ownerId: null,
                  minPlayers: null,
                  maxPlayers: null,
                  maxPlayTime: null,
                  unplayedOnly: false,
                  ownedByMeOnly: false,
                  noOwnersOnly: false,
                })
              }
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