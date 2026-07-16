"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { AsyncState } from "@/components/ui/AsyncState";
import { StatusPill } from "@/components/dashboard/kyc-status";
import { fetchFundingOfferHistory } from "@/services/deal-room.service";
import { FUNDING_OFFER_STATUS_META } from "./deal-room-meta";
import type { ApiError } from "@/lib/axios";
import type { DealFundingOffer } from "./types";

interface FundingOffersDrawerProps {
  open: boolean;
  onClose: () => void;
  dealRoomId: string;
  /** Bumped whenever a funding_offer_created/_responded socket event lands, so an
   *  already-open drawer refetches live (mirrors MeetingsDrawer's dealRoomId-only
   *  refetch-on-open, extended with a live key since offers change more often mid-session). */
  refreshKey?: number;
  /** Open the details modal for the chosen offer. */
  onSelect: (offer: DealFundingOffer) => void;
}

/**
 * Right-side drawer listing EVERY funding offer + counter-offer exchanged in this deal
 * room (the full negotiation chain), newest version first — mirrors MeetingsDrawer's
 * fetch-on-open + AsyncState pattern. Each row opens FundingOfferDetailModal.
 */
export function FundingOffersDrawer({ open, onClose, dealRoomId, refreshKey, onSelect }: FundingOffersDrawerProps) {
  const [offers, setOffers] = useState<DealFundingOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOffers(await fetchFundingOfferHistory(dealRoomId));
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

  const sorted = [...offers].sort((a, b) => b.version - a.version);

  return (
    <Drawer open={open} onClose={onClose} title="Funding Offers" subtitle="Every offer exchanged in this negotiation" footer={null}>
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={offers.length === 0}
        emptyIcon="handshake"
        emptyText="No funding offers yet."
        onRetry={load}
      >
        <ul className="flex flex-col gap-1">
          {sorted.map((offer) => {
            const statusMeta = FUNDING_OFFER_STATUS_META[offer.status];
            return (
              <li key={offer.id}>
                <button
                  type="button"
                  onClick={() => onSelect(offer)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-container-low"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-on-surface">
                      {offer.currency} {offer.amount.toLocaleString()} · {offer.equityPercent}%
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant">
                      {offer.parentOfferId ? `Counter · Version ${offer.version}` : "Original offer"}
                    </span>
                  </span>
                  <StatusPill icon={statusMeta.icon} label={statusMeta.label} />
                </button>
              </li>
            );
          })}
        </ul>
      </AsyncState>
    </Drawer>
  );
}
