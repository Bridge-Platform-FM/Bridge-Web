"use client";

import { Modal } from "@/components/modal/Modal";
import { Icon } from "@/components/ui/Icon";
import type { ScheduledMeeting } from "./ScheduleMeetingDrawer";

const DURATION_LABELS: Record<string, string> = {
  "15m": "15 min",
  "30m": "30 min",
  "45m": "45 min",
  "60m": "1 hour",
};

/** One label + value row in the details body. */
function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-on-surface-variant">{label}</p>
        <p className="break-words text-sm font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

interface MeetingDetailsModalProps {
  meeting: ScheduledMeeting | null;
  onClose: () => void;
}

/** Modal showing the full details of a scheduled meeting, opened from the meeting list. */
export function MeetingDetailsModal({ meeting, onClose }: MeetingDetailsModalProps) {
  if (!meeting) return null;

  return (
    <Modal open={!!meeting} onClose={onClose} title={meeting.title} maxWidthClass="max-w-lg">
      <div className="flex flex-col gap-5">
        <DetailRow icon="event" label="Date" value={meeting.when} />
        <DetailRow icon="schedule" label="Duration" value={DURATION_LABELS[meeting.duration] ?? meeting.duration} />
        {meeting.link && (
          <DetailRow icon="link" label="Link" value={meeting.link} />
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
    </Modal>
  );
}
