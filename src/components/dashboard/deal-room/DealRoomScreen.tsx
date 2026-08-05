"use client";

import { DealRoomList } from "./DealRoomList";
import { DEAL_TABS } from "./deal-room-meta";
import type { DealRoom, DealRoomTab } from "./types";

interface DealRoomScreenProps {
  rooms: DealRoom[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  tab: DealRoomTab;
  onTabChange: (t: DealRoomTab) => void;
  onOpen: (room: DealRoom) => void;
}

/**
 * The Deal Rooms list screen — "Workspace Overview" header, Active/Closed Deals
 * toggle, then the rooms list. Data-source agnostic (same shape as ConnectionsScreen),
 * so a future live page could render this unchanged.
 */
export function DealRoomScreen({
  rooms,
  loading,
  error,
  onRetry,
  tab,
  onTabChange,
  onOpen,
}: DealRoomScreenProps) {
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-8">
      {/* Header row — eyebrow + title on the left, deals toggle on the right */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-on-surface-variant uppercase">
            Workspace Overview
          </p>
          <h1 className="mt-1 font-headline text-3xl font-extrabold tracking-[-0.02em] text-primary">
            Deal Rooms
          </h1>
        </div>

        {/* Active Deals / Closed Deals toggle */}
        <div className="inline-flex gap-1 rounded-full bg-surface-container-high p-1">
          {DEAL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <DealRoomList rooms={rooms} onOpen={onOpen} loading={loading} error={error} onRetry={onRetry} />
    </div>
  );
}
