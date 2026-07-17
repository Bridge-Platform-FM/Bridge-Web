"use client";

/**
 * Client-side "archived deal rooms" store — persisted in localStorage, no backend.
 * Archiving a deal room just remembers its id in this browser; the list screen filters
 * archived rooms out of Active/Closed and into the Archived tab. This is deliberately
 * frontend-only (per-browser, not shared with the counterparty) until a real backend
 * "Archived" status exists — swap this module for a service call then.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "bridge-platform.archived-deal-rooms";
/** Fired after a local archive/unarchive so open components re-read within the same tab
 *  (the native `storage` event only fires in OTHER tabs). */
const CHANGE_EVENT = "bridge-platform:archived-deal-rooms-changed";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** All archived deal-room ids (this browser). */
export function getArchivedDealRoomIds(): Set<string> {
  return new Set(readIds());
}

export function isDealRoomArchived(id: string): boolean {
  return readIds().includes(id);
}

export function archiveDealRoom(id: string): void {
  const ids = readIds();
  if (!ids.includes(id)) writeIds([...ids, id]);
}

export function unarchiveDealRoom(id: string): void {
  writeIds(readIds().filter((x) => x !== id));
}

/**
 * Reactive view of the archived-id set — re-renders when a room is archived/unarchived
 * (this tab via CHANGE_EVENT, other tabs via the native `storage` event). SSR-safe:
 * starts empty, hydrates from localStorage on mount.
 */
export function useArchivedDealRooms(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setIds(new Set(readIds()));
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return ids;
}
