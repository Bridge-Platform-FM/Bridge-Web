"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/modal/Modal";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { TimePicker } from "@/components/ui/TimePicker";
import { AsyncState } from "@/components/ui/AsyncState";
import { ToggleSwitch } from "@/components/ui/ToggleSwitch";
import { todayLocalDateStr, nowLocalTimeStr } from "@/lib/utils";
import { fetchMeetingDetail, updateMeeting, type UpdateMeetingPayload } from "@/services/deal-room.service";
import type { ApiError } from "@/lib/axios";
import type { ScheduledMeeting } from "./types";

const DURATION_LABELS: Record<string, string> = {
  "15m": "15 min",
  "30m": "30 min",
  "45m": "45 min",
  "60m": "1 hour",
};

/** One label + value row in the read-only details view. */
function DetailRow({ icon, label, value, action }: { icon: string; label: string; value: string; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-on-surface-variant">{label}</p>
        <p className="break-words text-sm font-semibold text-on-surface">{value}</p>
      </div>
      {action}
    </div>
  );
}

/** Split an ISO timestamp into `<input type="date">` / `<input type="time">` values. */
function splitScheduledAt(iso: string): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

interface MeetingDetailsModalProps {
  /** Id of the meeting to show; null = modal closed. */
  meetingId: string | null;
  onClose: () => void;
  /** Fired after a successful edit so the caller can refresh its own lists. */
  onUpdated?: (meeting: ScheduledMeeting) => void;
}

/**
 * Modal showing (and editing) the full details of a scheduled meeting. Fetches its own
 * data from `GET /meetings/detail?meetingId=` whenever `meetingId` changes, and can PUT
 * edits back via `updateMeeting`.
 */
export function MeetingDetailsModal({ meetingId, onClose, onUpdated }: MeetingDetailsModalProps) {
  const [meeting, setMeeting] = useState<ScheduledMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [agenda, setAgenda] = useState("");

  /** Reset the editable-field state from a meeting (fetched or just-saved) —
   *  used on load and to discard unsaved edits on cancel. */
  const syncFieldsFrom = (m: ScheduledMeeting) => {
    setTitle(m.title);
    const { date: d, time: t } = splitScheduledAt(m.scheduledAt);
    setDate(d);
    setTime(t);
    setLink(m.link);
    setAgenda(m.agenda);
  };

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchMeetingDetail(meetingId);
      setMeeting(detail);
      syncFieldsFrom(detail);
    } catch (err) {
      setError((err as ApiError).message ?? "Couldn't load the meeting.");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lives in load()
    if (meetingId) load();
    else setEditing(false);
  }, [meetingId, load]);

  const today = todayLocalDateStr();
  const minTime = date === today ? nowLocalTimeStr() : undefined;

  const handleDateChange = (nextDate: string) => {
    setDate(nextDate);
    if (nextDate === today && time && time < nowLocalTimeStr()) setTime("");
  };

  const copyLink = async () => {
    if (!meeting?.link) return;
    await navigator.clipboard.writeText(meeting.link);
    toast.success("Link copied to clipboard.");
  };

  const close = () => {
    setEditing(false);
    onClose();
  };

  const handleToggleEdit = (on: boolean) => {
    if (!on && meeting) syncFieldsFrom(meeting);
    setEditing(on);
  };

  const save = async () => {
    if (!meetingId || !meeting) return;

    const nextScheduledAt = date && time ? new Date(`${date}T${time}`).toISOString() : meeting.scheduledAt;
    const payload: UpdateMeetingPayload = {};
    if (title.trim() !== meeting.title) payload.title = title.trim();
    if (agenda.trim() !== meeting.agenda) payload.agenda = agenda.trim();
    if (link.trim() !== meeting.link) payload.meetingLink = link.trim();
    if (nextScheduledAt !== meeting.scheduledAt) payload.scheduledAt = nextScheduledAt;

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save.");
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      const updated = await updateMeeting(meetingId, payload);
      setMeeting(updated);
      syncFieldsFrom(updated);
      setEditing(false);
      onUpdated?.(updated);
      toast.success("Meeting updated.");
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't update the meeting. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!meetingId}
      onClose={close}
      title={meeting?.title ?? "Meeting"}
      maxWidthClass="max-w-lg"
      headerExtra={
        !loading && meeting?.createdByMe ? (
          <ToggleSwitch checked={editing} onChange={handleToggleEdit} label={editing ? "Editing" : "Edit"} />
        ) : null
      }
      footer={
        editing ? (
          <>
            <button
              type="button"
              onClick={() => handleToggleEdit(false)}
              className="flex h-11 items-center justify-center rounded-xl px-5 font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !title.trim()}
              className="flex h-11 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="check" size={18} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </>
        ) : null
      }
    >
      <AsyncState loading={loading} error={error} onRetry={load}>
        {editing ? (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary-container/30 px-4 py-3 text-sm text-on-primary-container">
              <Icon name="edit_note" size={18} />
              <span>
                Edit mode is on — make your changes and click <strong>Save Changes</strong> below.
              </span>
            </div>
            <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date" required type="date" min={today} value={date} onChange={(e) => handleDateChange(e.target.value)} />
              <TimePicker label="Time" required value={time} onChange={setTime} minTime={minTime} />
            </div>
            <Input label="Link" type="url" value={link} onChange={(e) => setLink(e.target.value)} />
            <Textarea label="Agenda" rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} />
          </div>
        ) : (
          meeting && (
            <div className="flex flex-col gap-5">
              <DetailRow icon="event" label="Date" value={meeting.when} />
              <DetailRow icon="schedule" label="Duration" value={DURATION_LABELS[meeting.duration] ?? meeting.duration} />
              {meeting.link && (
                <DetailRow
                  icon="link"
                  label="Link"
                  value={meeting.link}
                  action={
                    <button
                      type="button"
                      onClick={copyLink}
                      aria-label="Copy link"
                      className="shrink-0 rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                    >
                      <Icon name="content_copy" size={18} />
                    </button>
                  }
                />
              )}
              {meeting.agenda && (
                <div className="flex items-start gap-3">
                  <Icon name="notes" size={20} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface-variant">Agenda</p>
                    <p className="whitespace-pre-wrap text-sm text-on-surface">{meeting.agenda}</p>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </AsyncState>
    </Modal>
  );
}
