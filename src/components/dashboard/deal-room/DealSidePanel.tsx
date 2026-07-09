"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { SharedFilesDrawer } from "./SharedFilesDrawer";
import { ScheduleMeetingDrawer, type ScheduleMeetingFormValues } from "./ScheduleMeetingDrawer";
import { MeetingsDrawer } from "./MeetingsDrawer";
import { MeetingDetailsModal } from "./MeetingDetailsModal";
import { fetchUpcomingMeetings, scheduleMeeting } from "@/services/deal-room.service";
import type { ApiError } from "@/lib/axios";
import type { DealRoom, PreviewableFile, ScheduledMeeting } from "./types";

/** A file shared in the deal room (top-N preview, derived from the chat thread). */
interface SharedFile {
  id: string;
  name: string;
  size: string;
  by: string;
  icon: string;
  /** Preview payload for opening the watermarked modal. */
  preview: PreviewableFile;
}

/** Small reusable card shell for the side panel. */
function PanelCard({
  icon,
  title,
  action,
  children,
}: {
  icon: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon name={icon} size={18} className="text-primary" />
        <h3 className="flex-1 font-headline text-sm font-bold text-on-surface">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

interface DealSidePanelProps {
  room: DealRoom;
  /** When the deal is closed the scheduling/actions are disabled. */
  closed: boolean;
  /** Open the watermarked preview modal for a shared file. */
  onPreview: (file: PreviewableFile) => void;
}

/**
 * The deal room's RIGHT-hand panel: Upcoming Meetings (with Schedule Meeting),
 * Shared Files (top-N inline + a "View All" drawer backed by the files API), and
 * Active Participants.
 */
export function DealSidePanel({ room, closed, onPreview }: DealSidePanelProps) {
  const { counterparty: cp } = room;

  // Inline preview — loaded from GET /meetings/upcoming; refetched after scheduling.
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [meetingsOpen, setMeetingsOpen] = useState(false);
  /** Id of the meeting whose details modal is open; null = closed. */
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const loadUpcomingMeetings = useCallback(() => {
    fetchUpcomingMeetings(room.id)
      .then(setMeetings)
      .catch((err) => {
        toast.error((err as ApiError).message ?? "Couldn't load upcoming meetings.");
      });
  }, [room.id]);

  useEffect(() => {
    loadUpcomingMeetings();
  }, [loadUpcomingMeetings]);

  // Inline top-4 preview is derived from the chat thread's attachments; the full list
  // lives behind "View All Files" (SharedFilesDrawer, backed by the files API).
  const files = useMemo<SharedFile[]>(
    () =>
      room.messages
        .filter((m) => m.attachment)
        .map((m) => {
          const a = m.attachment!;
          return {
            id: m.id,
            name: a.name,
            size: `${(a.size / 1024).toFixed(0)} KB`,
            by: m.sender === "me" ? "You" : cp.name,
            icon: a.kind === "image" ? "image" : "description",
            preview: { name: a.name, s3Key: a.s3Key, mimeType: a.mimeType, downloadAllowed: a.downloadAllowed },
          };
        }),
    [room.messages, cp.name],
  );

  const handleScheduleMeeting = async (values: ScheduleMeetingFormValues) => {
    try {
      await scheduleMeeting({
        dealRoomId: Number(room.id),
        recipientUserId: cp.userId,
        title: values.title,
        agenda: values.agenda,
        meetingLink: values.link,
        scheduledAt: new Date(`${values.date}T${values.time}`).toISOString(),
        duration: values.duration,
      });
      loadUpcomingMeetings();
      setScheduleOpen(false);
      toast.success("Meeting scheduled.");
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't schedule the meeting. Please try again.");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ---- Upcoming Meetings ---- */}
        <PanelCard
          icon="event"
          title="Upcoming Meetings"
          action={
            <button
              type="button"
              onClick={() => setMeetingsOpen(true)}
              className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-secondary-container/70"
            >
              View All
            </button>
          }
        >
          {meetings.length === 0 ? (
            <p className="py-2 text-xs text-on-surface-variant">No meetings scheduled yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {meetings.slice(0, 2).map((mtg) => (
                <li key={mtg.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMeetingId(mtg.id)}
                    className="w-full rounded-xl bg-surface-container-low p-3 text-left transition-colors hover:bg-surface-container"
                  >
                    <p className="text-sm font-bold text-on-surface">{mtg.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
                      <Icon name="schedule" size={13} />
                      {mtg.when}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            disabled={closed}
            onClick={() => setScheduleOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            <Icon name="add" size={16} />
            Schedule Meeting
          </button>
        </PanelCard>

        {/* ---- Shared Files ---- */}
        <PanelCard
          icon="folder_open"
          title="Shared Files"
          action={
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
              {files.length}
            </span>
          }
        >
          {files.length === 0 ? (
            <p className="py-2 text-xs text-on-surface-variant">No files shared yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {files.slice(0, 2).map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => onPreview(f.preview)}
                    className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-surface-container-low"
                  >
                    <Icon name={f.icon} size={22} className="shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-on-surface">{f.name}</span>
                      <span className="block truncate text-[11px] text-on-surface-variant">
                        {f.size} · {f.by}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => setFilesOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
          >
            <Icon name="folder_open" size={16} />
            View All Files
          </button>
        </PanelCard>
      </div>

      {/* All shared files (API-backed) */}
      <SharedFilesDrawer
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        dealRoomId={room.id}
        onPreview={onPreview}
      />

      {/* Schedule Meeting drawer (right slide-in) */}
      <ScheduleMeetingDrawer open={scheduleOpen} onClose={() => setScheduleOpen(false)} onConfirm={handleScheduleMeeting} />

      {/* All meetings (mirrors Shared Files' "View All"), loaded from GET /meetings */}
      <MeetingsDrawer
        open={meetingsOpen}
        onClose={() => setMeetingsOpen(false)}
        dealRoomId={room.id}
        onSelect={(id) => setSelectedMeetingId(id)}
        onScheduleNew={() => {
          setMeetingsOpen(false);
          setScheduleOpen(true);
        }}
        closed={closed}
      />

      {/* Meeting details modal, opened by id from either the inline list or MeetingsDrawer */}
      <MeetingDetailsModal
        meetingId={selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
        onUpdated={loadUpcomingMeetings}
      />
    </>
  );
}
