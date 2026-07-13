/**
 * DEMO-ONLY presentation helpers for the Deal Room feature (status tabs, stage
 * pipeline, formatting). Local to the deal-room folder so the demo deletes cleanly.
 */

import type { DealRoom, DealRoomStatus, DealRoomTab } from "./types";

/** The list toggle buckets — ACTIVE also includes PAUSED rooms. */
export const DEAL_TABS: { key: DealRoomTab; label: string }[] = [
  { key: "ACTIVE", label: "Active Deals" },
  { key: "CLOSED", label: "Closed Deals" },
];

/** Does a room belong to a given tab? (Paused rooms live under Active Deals.) */
export function roomInTab(room: DealRoom, tab: DealRoomTab): boolean {
  return tab === "CLOSED" ? room.status === "CLOSED" : room.status !== "CLOSED";
}

/** Status badge pill meta (label + colour classes) for the list cards. */
export const DEAL_STATUS_BADGE: Record<DealRoomStatus, { label: string; className: string }> = {
  // Arbitrary hex (not bg-green-700): this Tailwind v4 theme only generates a few green
  // utilities, so token classes like bg-green-700 render as no-fill. Hex always generates.
  ACTIVE: { label: "Active", className: "bg-[#15803d] text-white" },
  PAUSED: { label: "Paused", className: "bg-secondary text-on-secondary" },
  CLOSED: { label: "Closed", className: "bg-surface-container-highest text-on-surface-variant" },
};

/** The fixed 4-step deal pipeline rendered by the chat page's stage stepper. */
export const DEAL_STAGES = ["Initial Connection", "Negotiation", "Due Diligence", "Closing"] as const;

/** "2h ago" / "3d ago" style relative time for list rows + message meta. */
export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (!iso || Number.isNaN(t)) return ""; // no/invalid date → no "NaNd ago"
  const diffMs = Date.now() - t;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/** Clock time (e.g. "10:24 AM") for a message bubble. */
export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** "Today" / "Yesterday" / "12 Jun 2026" — for the date dividers in the thread. */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/** "Maharashtra, India" from state + country (skips blanks; a lone value renders alone). */
export function formatLocation(state?: string | null, country?: string | null): string {
  return [state?.trim(), country?.trim()].filter(Boolean).join(", ");
}

/** Two-letter initials from a display name (avatar fallback). */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
