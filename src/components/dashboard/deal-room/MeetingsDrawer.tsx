"use client";

import { Drawer } from "@/components/ui/Drawer";
import { AsyncState } from "@/components/ui/AsyncState";
import { Icon } from "@/components/ui/Icon";
import type { ScheduledMeeting } from "./ScheduleMeetingDrawer";

interface MeetingsDrawerProps {
  open: boolean;
  onClose: () => void;
  meetings: ScheduledMeeting[];
  /** Open the details modal for the chosen meeting. */
  onSelect: (meeting: ScheduledMeeting) => void;
  /** Open the Schedule Meeting drawer. */
  onScheduleNew: () => void;
  closed: boolean;
}

/**
 * Right-side drawer listing EVERY meeting scheduled in this deal room. Mirrors
 * `SharedFilesDrawer`'s layout; each row opens `MeetingDetailsModal`. Also surfaces
 * "Schedule Meeting" in the footer since meetings (unlike files) are created here.
 */
export function MeetingsDrawer({ open, onClose, meetings, onSelect, onScheduleNew, closed }: MeetingsDrawerProps) {
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
        loading={false}
        error={null}
        isEmpty={meetings.length === 0}
        emptyIcon="event_busy"
        emptyText="No meetings scheduled yet."
      >
        <ul className="flex flex-col gap-1">
          {meetings.map((mtg) => (
            <li key={mtg.id}>
              <button
                type="button"
                onClick={() => onSelect(mtg)}
                className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-container-low"
              >
                <Icon name="event" size={22} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-on-surface">{mtg.title}</span>
                  <span className="block truncate text-xs text-on-surface-variant">{mtg.when}</span>
                </span>
                <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
              </button>
            </li>
          ))}
        </ul>
      </AsyncState>
    </Drawer>
  );
}
