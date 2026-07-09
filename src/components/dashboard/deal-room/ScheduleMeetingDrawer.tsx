"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

/** The scheduled meeting payload handed back on Confirm (UI-only for now). */
export interface ScheduledMeeting {
  id: string;
  title: string;
  /** Friendly when-label, e.g. "Oct 24". */
  when: string;
  /** Raw date value from the form (yyyy-mm-dd), if provided. */
  date: string;
  duration: string;
  link: string;
  agenda: string;
}

/** Duration dropdown options. */
const DURATION_OPTIONS = [
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "45m", label: "45 min" },
  { value: "60m", label: "1 hour" },
];

interface ScheduleMeetingDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Called on Confirm with the (UI-only) meeting. */
  onConfirm: (meeting: ScheduledMeeting) => void;
}

/**
 * Right-side drawer to schedule a meeting in the deal room. UI only for now — the fields
 * (duration, link, agenda) are collected locally; Confirm hands back a title +
 * when-label. Reuses the shared `Drawer`, `Input`, `Textarea`, `Select`.
 */
export function ScheduleMeetingDrawer({ open, onClose, onConfirm }: ScheduleMeetingDrawerProps) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("30m");
  const [link, setLink] = useState("");
  const [agenda, setAgenda] = useState("");

  const canConfirm = title.trim().length > 0;

  const reset = () => {
    setTitle("");
    setDate("");
    setDuration("30m");
    setLink("");
    setAgenda("");
  };

  const confirm = () => {
    if (!canConfirm) return;
    const when = date ? new Date(date).toLocaleDateString([], { month: "short", day: "numeric" }) : "Today";
    onConfirm({
      id: `m-${Date.now()}`,
      title: title.trim(),
      when,
      date,
      duration,
      link: link.trim(),
      agenda: agenda.trim(),
    });
    reset();
  };

  const discard = () => {
    reset();
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Schedule Meeting"
      subtitle="New event"
      widthClass="max-w-md"
      footer={
        <>
          <button
            type="button"
            onClick={discard}
            className="flex h-11 items-center rounded-xl border border-dashed border-outline-variant/60 px-5 font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="event_available" size={18} />
            Confirm Meeting
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Meeting title */}
        <Input
          label="Title"
          required
          placeholder="e.g. Q4 Strategy Review"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Date + Duration */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Duration" required options={DURATION_OPTIONS} value={duration} onChange={setDuration} searchable={false} />
        </div>

        {/* Meeting link (optional) */}
        <Input
          label="Link"
          optional
          type="url"
          placeholder="e.g. https://meet.google.com/abc-defg-hij"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        {/* Agenda */}
        <Textarea
          label="Agenda"
          rows={4}
          required
          placeholder="Outline the main objectives of this discussion…"
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
        />
      </div>
    </Drawer>
  );
}
