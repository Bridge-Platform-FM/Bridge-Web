"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/modal/Modal";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { SharedFilesDrawer } from "./SharedFilesDrawer";
import { ScheduleMeetingDrawer, type ScheduleMeetingFormValues } from "./ScheduleMeetingDrawer";
import { MeetingsDrawer } from "./MeetingsDrawer";
import { MeetingDetailsModal } from "./MeetingDetailsModal";
import { FundingOfferDrawer } from "./FundingOfferDrawer";
import { FundingOfferDetailModal } from "./FundingOfferDetailModal";
import { FundingOffersDrawer } from "./FundingOffersDrawer";
import {
  fetchCurrentFundingOffer,
  fetchDealRoomFiles,
  fetchUpcomingMeetings,
  scheduleMeeting,
  type SharedFileItem,
} from "@/services/deal-room.service";
import { getCurrentUserId } from "@/lib/jwt";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ApiError } from "@/lib/axios";
import type { DealFundingOffer, DealRoom, FundingOfferFormValues, PreviewableFile, ScheduledMeeting } from "./types";
import { DEAL_STAGES, DEAL_STAGE_ICONS, FUNDING_OFFER_STATUS_META, stageIndexFromValue } from "./deal-room-meta";

/** A file shared in the deal room (top-N preview, scoped to the current stage). */
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
  /** True once the room is on the final pipeline stage — nothing further to request. */
  isLastStage: boolean;
  /** Bumped whenever a `meeting_scheduled` socket event lands (own or counterparty's),
   *  so the "Upcoming Meetings" preview refetches live. */
  meetingsRefreshKey?: number;
  /** Open the watermarked preview modal for a shared file. */
  onPreview: (file: PreviewableFile) => void;
  /** Ask the counterparty to move to the next stage (`request_stage_update` socket). */
  onRequestNextStage: () => void;
  /** Accept the counterparty's pending stage-update request. */
  onAcceptStage: () => void;
  /** Reject the counterparty's pending stage-update request. */
  onRejectStage: () => void;
  /** Bumped whenever a funding_offer_created/_responded socket event lands, so the
   *  card's inline preview + any open detail modal refetch live (mirrors meetingsRefreshKey). */
  fundingOfferRefreshKey?: number;
  /** Send a brand-new funding offer (investor only). */
  onSendFundingOffer: (values: FundingOfferFormValues) => void | Promise<void>;
  /** Accept the given pending funding offer (recipient only). */
  onAcceptFundingOffer: (offerId: string) => void;
  /** Reject the given pending funding offer (recipient only). */
  onRejectFundingOffer: (offerId: string) => void;
  /** Submit a counter against the given funding offer (recipient only). */
  onCounterFundingOffer: (offerId: string, values: FundingOfferFormValues) => void | Promise<void>;
}

/**
 * The deal room's RIGHT-hand panel: Upcoming Meetings (with Schedule Meeting),
 * Shared Files (top-N inline + a "View All" drawer backed by the files API), and
 * Active Participants.
 */
export function DealSidePanel({
  room,
  closed,
  isLastStage,
  meetingsRefreshKey,
  onPreview,
  onRequestNextStage,
  onAcceptStage,
  onRejectStage,
  fundingOfferRefreshKey,
  onSendFundingOffer,
  onAcceptFundingOffer,
  onRejectFundingOffer,
  onCounterFundingOffer,
}: DealSidePanelProps) {
  const { counterparty: cp } = room;
  const { role } = useAuth();
  // Live stage name + icon — updates whenever room.stage changes (stage-update socket flow).
  const stageLabel = DEAL_STAGES[room.stage] ?? DEAL_STAGES[0];
  const stageIcon = DEAL_STAGE_ICONS[room.stage] ?? DEAL_STAGE_ICONS[0];
  const pendingStageRequest = room.pendingStageRequest;
  // Is the pending request mine (waiting on them) or theirs (I can accept/reject)?
  const iRequestedStage = pendingStageRequest != null && pendingStageRequest.requestedByUserId === getCurrentUserId();

  // Inline preview — loaded from GET /meetings/upcoming; refetched after scheduling.
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [meetingsOpen, setMeetingsOpen] = useState(false);
  /** Id of the meeting whose details modal is open; null = closed. */
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  /** Confirmation modal for "Request Next Stage" — asks before firing the socket event. */
  const [confirmStageOpen, setConfirmStageOpen] = useState(false);

  const loadUpcomingMeetings = useCallback(() => {
    fetchUpcomingMeetings(room.id)
      .then(setMeetings)
      .catch((err) => {
        toast.error((err as ApiError).message ?? "Couldn't load upcoming meetings.");
      });
  }, [room.id]);

  useEffect(() => {
    loadUpcomingMeetings();
    // meetingsRefreshKey deliberately included: a `meeting_scheduled` socket event (mine
    // or the counterparty's) bumps it so this refetches live, without polling.
  }, [loadUpcomingMeetings, meetingsRefreshKey]);

  // Inline top-2 preview is scoped to the CURRENT stage only (unlike "View All", which
  // shows every stage) — loaded from the files API and filtered by `room.stage`, since
  // each file row carries the stage it was shared under.
  const [stageFiles, setStageFiles] = useState<SharedFileItem[]>([]);

  useEffect(() => {
    fetchDealRoomFiles(room.id)
      .then((all) => {
        setStageFiles(all.filter((f) => stageIndexFromValue(f.stage) === room.stage));
      })
      .catch(() => {
        setStageFiles([]);
      });
  }, [room.id, room.stage]);

  const files = useMemo<SharedFile[]>(
    () =>
      stageFiles.map((f) => ({
        id: f.messageId,
        name: f.name,
        size: `${(f.size / 1024).toFixed(0)} KB`,
        by: f.by,
        icon: f.kind === "image" ? "image" : "description",
        preview: { name: f.name, s3Key: f.s3Key, mimeType: f.mimeType, downloadAllowed: f.downloadAllowed },
      })),
    [stageFiles],
  );

  const handleScheduleMeeting = async (values: ScheduleMeetingFormValues) => {
    try {
      await scheduleMeeting({
        dealRoomId: room.id,
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

  // Funding Offer card — visible only to startup/investor roles. Loaded from the
  // (placeholder) files API and refetched whenever a funding_offer_* socket event
  // bumps fundingOfferRefreshKey, mirroring the Upcoming Meetings pattern above.
  const [currentOffer, setCurrentOffer] = useState<DealFundingOffer | null>(null);
  const [offerDrawerOpen, setOfferDrawerOpen] = useState(false);
  const [offerDrawerMode, setOfferDrawerMode] = useState<"create" | "counter">("create");
  const [offersListOpen, setOffersListOpen] = useState(false);
  /** The offer shown in the detail modal — either the current one (inline row) or any
   *  past version picked from the "View All" history drawer; null = modal closed. */
  const [selectedOffer, setSelectedOffer] = useState<DealFundingOffer | null>(null);
  /** Snapshot of the offer being countered — kept separately from `selectedOffer` so
   *  the drawer still has it to prefill after the detail modal closes. */
  const [offerToCounter, setOfferToCounter] = useState<DealFundingOffer | null>(null);

  const loadCurrentOffer = useCallback(() => {
    fetchCurrentFundingOffer(room.id)
      .then(setCurrentOffer)
      .catch(() => setCurrentOffer(null));
  }, [room.id]);

  useEffect(() => {
    loadCurrentOffer();
  }, [loadCurrentOffer, fundingOfferRefreshKey]);

  const canShowFundingOffer = role === "startup" || role === "investor";
  const offerPending = !!currentOffer && currentOffer.status === "Pending";

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
          icon={stageIcon}
          title={stageLabel}
          action={
            <div className="flex items-center gap-1.5">
              <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant">
                {files.length}
              </span>
              <button
                type="button"
                onClick={() => setFilesOpen(true)}
                className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-secondary-container/70"
              >
                View All
              </button>
            </div>
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

          {pendingStageRequest && !iRequestedStage ? (
            // Their request is pending — I can accept or reject it.
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={onRejectStage}
                disabled={closed}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-outline-variant/50 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-error/50 hover:text-error disabled:opacity-50"
              >
                <Icon name="close" size={16} />
                Reject
              </button>
              <button
                type="button"
                onClick={onAcceptStage}
                disabled={closed}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg cta-gradient py-2 text-xs font-bold text-on-primary disabled:opacity-50"
              >
                <Icon name="check" size={16} />
                Accept
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmStageOpen(true)}
              disabled={closed || isLastStage || iRequestedStage}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
            >
              {iRequestedStage ? "Request Pending…" : "Request Next Stage"}
              <Icon name="arrow_forward" size={16} />
            </button>
          )}
        </PanelCard>

        {/* ---- Funding Offer (Stage 2: Negotiation) — startup/investor only ---- */}
        {canShowFundingOffer && (
          <PanelCard
            icon="handshake"
            title="Funding Offer"
            action={
              <button
                type="button"
                onClick={() => setOffersListOpen(true)}
                className="rounded-full bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-on-surface-variant transition-colors hover:bg-secondary-container/70"
              >
                View All
              </button>
            }
          >
            {!currentOffer ? (
              <p className="py-2 text-xs text-on-surface-variant">No funding offer yet.</p>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedOffer(currentOffer)}
                className="flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left transition-colors hover:bg-surface-container-low"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-on-surface">
                    {currentOffer.currency} {currentOffer.amount.toLocaleString()} · {currentOffer.equityPercent}%
                  </span>
                </span>
                <StatusPill {...FUNDING_OFFER_STATUS_META[currentOffer.status]} />
              </button>
            )}

            <div className="group relative">
              <button
                type="button"
                disabled={closed || role === "startup" || offerPending}
                onClick={() => {
                  setOfferDrawerMode("create");
                  setOfferDrawerOpen(true);
                }}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 py-2 text-xs font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
              >
                <Icon name="request_quote" size={16} />
                Request Offer
              </button>
              {role === "startup" && (
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 scale-95 rounded-lg bg-surface-container-highest px-3 py-2 text-center text-xs font-medium text-on-surface opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
                >
                  Only investors can send a funding offer.
                </span>
              )}
            </div>
          </PanelCard>
        )}
      </div>

      {/* Confirm before firing the request_stage_update socket event */}
      <Modal
        open={confirmStageOpen}
        onClose={() => setConfirmStageOpen(false)}
        title="Move to Next Stage?"
        maxWidthClass="max-w-sm"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmStageOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-outline-variant/50 font-bold text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              No
            </button>
            <button
              type="button"
              onClick={() => {
                onRequestNextStage();
                setConfirmStageOpen(false);
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl cta-gradient font-bold text-on-primary"
            >
              Yes
            </button>
          </>
        }
      >
        <p className="text-sm text-on-surface-variant">
          Do you want to request {cp.name} to move this deal to the next stage?
        </p>
      </Modal>

      {/* All shared files (API-backed) */}
      <SharedFilesDrawer
        open={filesOpen}
        onClose={() => setFilesOpen(false)}
        dealRoomId={room.id}
        currentStage={room.stage}
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

      {/* Create a new offer (investor) or submit a counter (founder, opened from the detail modal) */}
      <FundingOfferDrawer
        open={offerDrawerOpen}
        onClose={() => setOfferDrawerOpen(false)}
        mode={offerDrawerMode}
        counterpartyName={cp.name}
        sourceOffer={offerDrawerMode === "counter" ? offerToCounter : null}
        onConfirm={async (values) => {
          if (offerDrawerMode === "counter" && offerToCounter) {
            await onCounterFundingOffer(offerToCounter.id, values);
          } else {
            await onSendFundingOffer(values);
          }
          setOfferDrawerOpen(false);
        }}
      />

      {/* Every offer + counter-offer exchanged in this negotiation ("View All") */}
      <FundingOffersDrawer
        open={offersListOpen}
        onClose={() => setOffersListOpen(false)}
        dealRoomId={room.id}
        refreshKey={fundingOfferRefreshKey}
        onSelect={(offer) => {
          setSelectedOffer(offer);
          setOffersListOpen(false);
        }}
      />

      {/* Offer detail — Accept/Reject/Counter, role-gated to the offer's recipient. Opened
          from either the inline preview row (currentOffer) or the "View All" history drawer. */}
      <FundingOfferDetailModal
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        closed={closed}
        onAccept={() => {
          if (selectedOffer) onAcceptFundingOffer(selectedOffer.id);
          setSelectedOffer(null);
        }}
        onReject={() => {
          if (selectedOffer) onRejectFundingOffer(selectedOffer.id);
          setSelectedOffer(null);
        }}
        onCounter={() => {
          setOfferToCounter(selectedOffer);
          setOfferDrawerMode("counter");
          setOfferDrawerOpen(true);
          setSelectedOffer(null);
        }}
      />
    </>
  );
}
