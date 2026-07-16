"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Drawer } from "@/components/ui/Drawer";
import { AsyncState } from "@/components/ui/AsyncState";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { fetchCurrentFundingOffer, fetchFundingOfferHistory } from "@/services/deal-room.service";
import { getCurrentUserId } from "@/lib/jwt";
import { FUNDING_OFFER_STATUS_META } from "./deal-room-meta";
import type { ApiError } from "@/lib/axios";
import type { DealFundingOffer } from "./types";

/** One label + value row inside the Current Offer card. */
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

interface FundingOffersDrawerProps {
  open: boolean;
  onClose: () => void;
  dealRoomId: string;
  /** Bumped whenever an offer_received/_countered/_responded socket event lands, so an
   *  already-open drawer refetches live (mirrors MeetingsDrawer's dealRoomId-only
   *  refetch-on-open, extended with a live key since offers change more often mid-session). */
  refreshKey?: number;
  /** True once the deal is closed — disables all response actions. */
  closed?: boolean;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  /** Hands the current offer up so the caller can open the counter-offer form prefilled. */
  onCounter: (offer: DealFundingOffer) => void;
}

/**
 * Right-side drawer for the deal room's funding-offer negotiation: the currently
 * actionable offer (with role-gated Accept/Reject/Counter) on top, and the full
 * negotiation thread ("Counter History") underneath — replaces the old separate
 * "View All" list + detail modal with one combined view.
 */
export function FundingOffersDrawer({ open, onClose, dealRoomId, refreshKey, closed, onAccept, onReject, onCounter }: FundingOffersDrawerProps) {
  const [current, setCurrent] = useState<DealFundingOffer | null>(null);
  const [history, setHistory] = useState<DealFundingOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentOffer, allOffers] = await Promise.all([
        fetchCurrentFundingOffer(dealRoomId),
        fetchFundingOfferHistory(dealRoomId),
      ]);
      setCurrent(currentOffer);
      setHistory(allOffers);
    } catch (err) {
      setError((err as ApiError).message ?? "Couldn't load funding offers.");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lives in load()
    if (open) load();
  }, [open, load, refreshKey]);

  // "Counter History" = every past version, newest first, excluding whichever one is
  // shown as the actionable Current Offer above.
  const pastOffers = history.filter((o) => o.id !== current?.id).sort((a, b) => b.version - a.version);

  const isRecipient = !!current && current.recipientUserId === getCurrentUserId();
  const canRespond = isRecipient && current?.status === "Pending" && !closed;

  return (
    <Drawer open={open} onClose={onClose} title="Funding Offer" subtitle="Active transaction" footer={null}>
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={!current && history.length === 0}
        emptyIcon="handshake"
        emptyText="No funding offers yet."
        onRetry={load}
      >
        <div className="flex flex-col gap-6">
          {current && (
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h4 className="font-headline text-sm font-bold text-on-surface">Current Offer</h4>
                <StatusPill {...FUNDING_OFFER_STATUS_META[current.status]} />
              </div>

              <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <DetailRow icon="payments" label="Investment Amount" value={`${current.currency} ${current.amount.toLocaleString()}`} />
                <DetailRow icon="pie_chart" label="Equity Percentage" value={`${current.equityPercent}%`} />
                <DetailRow icon="request_quote" label="Company Valuation" value={current.valuationType} />
                <DetailRow
                  icon="event"
                  label="Offer Validity Period"
                  value={new Date(current.validUntil).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })}
                />
                {current.terms && <DetailRow icon="gavel" label="Terms & Conditions" value={current.terms} />}
                {current.notes && <DetailRow icon="notes" label="Supporting Notes" value={current.notes} />}
              </div>

              {canRespond && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onAccept(current.id)}
                    className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl cta-gradient font-bold text-on-primary"
                  >
                    <Icon name="check" size={16} />
                    Accept Offer
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onCounter(current)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-outline-variant/50 font-bold text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      <Icon name="swap_horiz" size={16} />
                      Counter
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(current.id)}
                      className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-outline-variant/50 font-bold text-on-surface-variant transition-colors hover:border-error/50 hover:text-error"
                    >
                      <Icon name="close" size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {pastOffers.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="font-headline text-sm font-bold text-on-surface">Counter History</h4>
              <ul className="flex flex-col gap-1">
                {pastOffers.map((offer) => {
                  const statusMeta = FUNDING_OFFER_STATUS_META[offer.status];
                  return (
                    <li key={offer.id} className="flex items-center justify-between gap-3 rounded-lg p-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">
                          {offer.currency} {offer.amount.toLocaleString()} · {offer.equityPercent}%
                        </span>
                        <span className="block truncate text-xs text-on-surface-variant">
                          {offer.parentOfferId ? `Counter · Version ${offer.version}` : "Original offer"}
                        </span>
                      </span>
                      <StatusPill icon={statusMeta.icon} label={statusMeta.label} />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </AsyncState>
    </Drawer>
  );
}
