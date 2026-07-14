"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { AsyncState } from "@/components/ui/AsyncState";
import { Icon } from "@/components/ui/Icon";
import { fetchAllMeetings } from "@/services/deal-room.service";
import type { ApiError } from "@/lib/axios";
import type { ScheduledMeeting } from "./types";

interface MeetingsDrawerProps {
  open: boolean;
  onClose: () => void;
  dealRoomId: string;
  /** Open the details modal for the chosen meeting id. */
  onSelect: (meetingId: string) => void;
  /** Open the Schedule Meeting drawer. */
  onScheduleNew: () => void;
  closed: boolean;
}

/**
 * Right-side drawer listing EVERY meeting scheduled in this deal room — loaded from
 * `GET /meetings?dealRoomId=`, mirroring `SharedFilesDrawer`'s fetch-on-open pattern.
 * Each row opens `MeetingDetailsModal` (by id, which fetches its own detail). Also
 * surfaces "Schedule Meeting" in the footer since meetings (unlike files) are created here.
 */
export function MeetingsDrawer({ open, onClose, dealRoomId, onSelect, onScheduleNew, closed }: MeetingsDrawerProps) {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMeetings(await fetchAllMeetings(dealRoomId));
    } catch (err) {
      setError((err as ApiError).message ?? "Couldn't load meetings.");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lives in load()
    if (open) load();
  }, [open, load]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Upcoming Meetings"
      subtitle="All meetings scheduled in this deal room"
      footer={
        <button
          type="button"
          disabled={closed}
          onClick={onScheduleNew}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="add" size={18} />
          Schedule Meeting
        </button>
      }
    >
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={meetings.length === 0}
        emptyIcon="event_busy"
        emptyText="No meetings scheduled yet."
        onRetry={load}
      >
        <ul className="flex flex-col gap-1">
          {(() => {
            const now = Date.now();
            const upcoming = meetings
              .filter((mtg) => new Date(mtg.scheduledAt).getTime() >= now)
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
            const past = meetings
              .filter((mtg) => new Date(mtg.scheduledAt).getTime() < now)
              .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
            return [...upcoming, ...past];
          })().map((mtg, index, sorted) => {
            const isPast = new Date(mtg.scheduledAt).getTime() < Date.now();
            const prevIsPast = index > 0 && new Date(sorted[index - 1].scheduledAt).getTime() < Date.now();
            const showHistoryDivider = isPast && !prevIsPast;
            return (
              <li key={mtg.id}>
                {showHistoryDivider && (
                  <div className="my-2 flex items-center gap-3 px-1" role="separator">
                    <span className="h-px flex-1 bg-outline-variant" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      History
                    </span>
                    <span className="h-px flex-1 bg-outline-variant" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(mtg.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-container-low"
                >
                  <Icon name="event" size={22} className={`shrink-0 ${isPast ? "text-on-surface-variant" : "text-primary"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${isPast ? "text-on-surface-variant" : "text-on-surface"}`}>
                      {mtg.title}
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">{mtg.when}</span>
                  </span>
                  <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
                </button>
              </li>
            );
          })}
        </ul>
      </AsyncState>
    </Drawer>
  );
}
