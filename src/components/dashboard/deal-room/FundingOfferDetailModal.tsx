"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/modal/Modal";
import { Icon } from "@/components/ui/Icon";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { getCurrentUserId } from "@/lib/jwt";
import { FUNDING_OFFER_STATUS_META } from "./deal-room-meta";
import type { DealFundingOffer } from "./types";

/** One label + value row — mirrors MeetingDetailsModal's DetailRow. */
function DetailRow({ icon, label, value }: { icon: string; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} size={20} className="mt-0.5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-on-surface-variant">{label}</p>
        <p className="break-words text-sm font-semibold text-on-surface">{value}</p>
      </div>
    </div>
  );
}

interface FundingOfferDetailModalProps {
  /** The offer to show; null = modal closed. */
  offer: DealFundingOffer | null;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onCounter: () => void;
  /** True once the deal is closed — disables all response actions. */
  closed?: boolean;
}

/**
 * Read-only detail view of a funding offer, with role-gated Accept / Reject / Submit
 * Counter-Offer actions — only shown to the offer's recipient while it's Pending.
 * There's only ever one active offer per room in this scope, so this takes the offer
 * directly (no fetch-by-id).
 */
export function FundingOfferDetailModal({ offer, onClose, onAccept, onReject, onCounter, closed }: FundingOfferDetailModalProps) {
  if (!offer) return null;

  const isRecipient = offer.recipientUserId === getCurrentUserId();
  const canRespond = isRecipient && offer.status === "Pending" && !closed;
  const statusMeta = FUNDING_OFFER_STATUS_META[offer.status];

  return (
    <Modal
      open={!!offer}
      onClose={onClose}
      title="Funding Offer"
      maxWidthClass="max-w-lg"
      footer={
        canRespond ? (
          <>
            <button
              type="button"
              onClick={onReject}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant/50 font-bold text-on-surface-variant transition-colors hover:border-error/50 hover:text-error"
            >
              <Icon name="close" size={16} />
              Reject
            </button>
            <button
              type="button"
              onClick={onCounter}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-outline-variant/50 font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Icon name="swap_horiz" size={16} />
              Counter
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl cta-gradient font-bold text-on-primary"
            >
              <Icon name="check" size={16} />
              Accept
            </button>
          </>
        ) : null
      }
    >
      <div className="flex flex-col gap-5">
        <StatusPill icon={statusMeta.icon} label={statusMeta.label} />

        <DetailRow icon="payments" label="Investment Amount" value={`${offer.currency} ${offer.amount.toLocaleString()}`} />
        <DetailRow icon="pie_chart" label="Equity Percentage" value={`${offer.equityPercent}%`} />
        <DetailRow icon="request_quote" label="Company Valuation" value={offer.valuationType} />
        <DetailRow
          icon="event"
          label="Offer Validity Period"
          value={new Date(offer.validUntil).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
        />
        {offer.terms && <DetailRow icon="gavel" label="Terms & Conditions" value={offer.terms} />}
        {offer.notes && <DetailRow icon="notes" label="Supporting Notes" value={offer.notes} />}
      </div>
    </Modal>
  );
}
