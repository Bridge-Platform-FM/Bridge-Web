/**
 * Shared utility helpers — pure functions with no side effects.
 * Import specific functions rather than the whole module.
 */

/**
 * Returns a human-readable relative time string for an ISO 8601 date,
 * e.g. "2 hours ago", "Just now". Used for session last-activity display.
 */
export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Formats an ISO 8601 date string into a locale-aware human-readable timestamp,
 * e.g. "22 Jun 2026, 10:30 AM". Used for session createdAt display.
 */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/** Today's date as `YYYY-MM-DD` in local time (not UTC, unlike `toISOString`). */
export function todayLocalDateStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Current time as `HH:mm` in local time. */
export function nowLocalTimeStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Whole days remaining until an ISO deadline, floored at 0 (never negative). */
export function daysRemaining(deadlineIso: string): number {
  return Math.max(0, Math.ceil((new Date(deadlineIso).getTime() - Date.now()) / 86_400_000));
}
