"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/modal/Modal";
import { SharedFilesDrawer } from "./SharedFilesDrawer";
import type { DealRoom, PreviewableFile } from "./types";

/** A scheduled meeting shown in the Upcoming Meetings card (demo-only). */
interface Meeting {
  id: string;
  title: string;
  /** Friendly when-label, e.g. "Today, 11:30 AM". */
  when: string;
}

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

  // No dummy meetings — starts empty; the user adds them via Schedule Meeting.
  // TODO(backend): load scheduled meetings for this room when the API is ready.
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);

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

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* ---- Upcoming Meetings ---- */}
        <PanelCard
          icon="event"
          title="Upcoming Meetings"
          action={
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
              {meetings.length} Scheduled
            </span>
          }
        >
          {meetings.length === 0 ? (
            <p className="py-2 text-xs text-on-surface-variant">No meetings scheduled yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {meetings.map((mtg) => (
                <li key={mtg.id} className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-sm font-bold text-on-surface">{mtg.title}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
                    <Icon name="schedule" size={13} />
                    {mtg.when}
                  </p>
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
              {files.slice(0, 4).map((f) => (
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

      {/* Schedule Meeting modal */}
      <ScheduleMeetingModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onSchedule={(mtg) => {
          setMeetings((prev) => [...prev, mtg]);
          setScheduleOpen(false);
          toast.success("Meeting scheduled.");
        }}
      />
    </>
  );
}

/** Lightweight schedule form in a shared Modal. */
function ScheduleMeetingModal({
  open,
  onClose,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  onSchedule: (m: Meeting) => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const canSave = title.trim() && date && time;

  const submit = () => {
    if (!canSave) return;
    const when = new Date(`${date}T${time}`).toLocaleString([], {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    onSchedule({ id: `m-${Date.now()}`, title: title.trim(), when });
    setTitle("");
    setDate("");
    setTime("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Meeting"
      maxWidthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 items-center rounded-xl px-5 font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="event_available" size={18} />
            Schedule
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Meeting title"
          required
          placeholder="e.g. Due Diligence Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input label="Time" required type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
