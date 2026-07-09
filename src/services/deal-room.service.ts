/**
 * Deal Room API layer — wired to Bridge-Server (`/api/v1/deal-rooms`, JWT). The pages
 * call these functions (never axios directly), and the `to*` normalizers map the
 * backend's flat snake_case rows into the UI's `DealRoom` / `DealMessage` types.
 *
 * Contract notes (see Bridge-Server):
 * - The list returns BOTH participants (`requester_*` + `recipient_*`); we pick the
 *   counterparty by comparing the logged-in user id (`getCurrentUserId`) to each side.
 * - There is NO single-room-detail endpoint, so `fetchDealRoom` fetches the list and
 *   finds the room. (A `GET /deal-rooms/:id` would be cleaner — flagged to backend.)
 * - The list carries no stage/unread/last-message → those default (stage 0, unread 0,
 *   lastActivity = room created date), matching the "keep UI, safe defaults" decision.
 * - TEXT messages are sent over the socket (`send_message`), not a REST call; this file
 *   only fetches history + closes the room. `normalizeMessage` is exported for the
 *   socket `new_message` handler to reuse.
 */

import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import { normalizeRole } from "@/lib/roles";
import { getCurrentUserId } from "@/lib/jwt";
import type { DealAttachment, DealMessage, DealRoom } from "@/components/dashboard/deal-room/types";

/** One flat deal-room row from `GET /deal-rooms` (snake_case, both participants inline). */
interface RawRoom {
  deal_room_id: number;
  title: string | null;
  deal_room_status: string; // "Active" | "Closed"
  deal_room_created_at: string;
  requester_user_id: number;
  requester_first_name?: string;
  requester_last_name?: string;
  requester_role_code?: string;
  requester_company_name?: string;
  recipient_user_id: number;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_role_code?: string;
  recipient_company_name?: string;
}

/** One message row from `GET /deal-rooms/:id/messages` (+ nested sender in history). */
export interface RawMessage {
  id: number;
  deal_room_id?: number;
  sender_user_id: number;
  message: string | null;
  message_type?: string; // TEXT | IMAGE | DOCUMENT | AUDIO | VIDEO
  attachment_file_name?: string | null;
  attachment_file_size?: number | null;
  attachment_s3_key?: string | null;
  attachment_mime_type?: string | null;
  download_allowed?: boolean | null;
  read_at?: string | null;
  created_at: string;
  sender?: { id: number; first_name?: string; last_name?: string } | null;
}

const fullName = (first?: string, last?: string) => [first, last].filter(Boolean).join(" ").trim();

/** Coerce a truthy-ish value (boolean, "true"/"false"/"1"/"0", 1/0) to a boolean. */
function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return ["true", "1", "yes"].includes(v.trim().toLowerCase());
  return false;
}

/**
 * Read the "download allowed" permission from a raw row, tolerant of the exact field
 * name and type the backend uses. Checks the download flag first; if absent, falls back
 * to the inverse of an explicit `view_only`/`is_view_only` flag. Defaults to false.
 */
function readDownloadAllowed(raw: Record<string, unknown>): boolean {
  const downloadKey = ["download_allowed", "downloadAllowed", "allow_download", "is_download_allowed", "can_download"].find(
    (k) => raw[k] != null,
  );
  if (downloadKey) return toBool(raw[downloadKey]);

  const viewKey = ["view_only", "viewOnly", "is_view_only"].find((k) => raw[k] != null);
  if (viewKey) return !toBool(raw[viewKey]);

  return false;
}

/** Build a DealRoom from a flat row, picking the counterparty relative to the current user. */
function toDealRoom(raw: RawRoom): DealRoom {
  const me = getCurrentUserId();
  // The counterparty is whichever side isn't me; default to the recipient if unknown.
  const iAmRequester = me != null && me === raw.requester_user_id;
  const cp = iAmRequester
    ? {
        name: fullName(raw.recipient_first_name, raw.recipient_last_name),
        company: raw.recipient_company_name ?? "",
        role: raw.recipient_role_code,
      }
    : {
        name: fullName(raw.requester_first_name, raw.requester_last_name),
        company: raw.requester_company_name ?? "",
        role: raw.requester_role_code,
      };

  return {
    id: String(raw.deal_room_id),
    title: raw.title || cp.company || "Deal Room",
    counterparty: {
      name: cp.name || cp.company || "—",
      title: "", // backend has no designation field
      company: cp.company,
      role: normalizeRole(cp.role) ?? "startup",
    },
    status: raw.deal_room_status === "Closed" ? "CLOSED" : "ACTIVE",
    stage: 0, // backend has no stage concept — default to the first step
    lastActivityNote: "",
    lastActivityAt: raw.deal_room_created_at ?? "",
    unread: 0,
    messages: [], // populated separately via fetchDealRoomMessages
  };
}

/** Normalize one raw message into a UI DealMessage. Exported for the socket handler. */
export function normalizeMessage(raw: RawMessage): DealMessage {
  const me = getCurrentUserId();
  const mine = me != null && raw.sender_user_id === me;
  const attachment: DealAttachment | undefined = raw.attachment_file_name
    ? {
        messageId: String(raw.id),
        name: raw.attachment_file_name,
        size: raw.attachment_file_size ?? 0,
        // Images render an inline/preview thumbnail; everything else is a file chip.
        kind: raw.attachment_mime_type?.startsWith("image/") ? "image" : "file",
        ...(raw.attachment_s3_key ? { s3Key: raw.attachment_s3_key } : {}),
        ...(raw.attachment_mime_type ? { mimeType: raw.attachment_mime_type } : {}),
        downloadAllowed: readDownloadAllowed(raw as unknown as Record<string, unknown>),
        url: "",
      }
    : undefined;
  return {
    id: String(raw.id),
    sender: mine ? "me" : "them",
    authorName: mine ? "You" : fullName(raw.sender?.first_name, raw.sender?.last_name),
    ...(raw.message ? { text: raw.message } : {}),
    ...(attachment ? { attachment } : {}),
    at: raw.created_at ?? new Date().toISOString(),
    read: !!raw.read_at,
  };
}

/** List the current user's deal rooms. GET. */
export async function fetchDealRooms(): Promise<DealRoom[]> {
  const { data } = await api.get<{ data?: RawRoom[] }>(API_ENDPOINTS.DEAL_ROOMS_LIST);
  return (data.data ?? []).map(toDealRoom).filter((r) => r.id !== "");
}

/** Fetch a single room's meta by finding it in the list (no detail endpoint exists). */
export async function fetchDealRoom(id: string): Promise<DealRoom | undefined> {
  const rooms = await fetchDealRooms();
  return rooms.find((r) => r.id === id);
}

/** Fetch a room's message history (returned newest-first; reversed to chronological). */
export async function fetchDealRoomMessages(id: string): Promise<DealMessage[]> {
  const { data } = await api.get<{ data?: RawMessage[] }>(API_ENDPOINTS.DEAL_ROOM_MESSAGES(id));
  return (data.data ?? []).map(normalizeMessage).reverse();
}

/** Close a deal room (both sides become read-only). PUT, optional reason. */
export async function closeDealRoom(id: string, reason?: string): Promise<void> {
  await api.put(API_ENDPOINTS.DEAL_ROOM_CLOSE(id), reason ? { reason } : {});
}

/**
 * Send a file/media message. POST multipart (`media` file + optional `caption`). The
 * server persists + uploads to S3 and broadcasts `new_message` to the room (incl. the
 * sender), so the message renders via the socket handler — no need to append the return.
 */
export async function sendDealMedia(
  id: string,
  file: File,
  caption?: string,
  downloadAllowed = false,
): Promise<void> {
  const form = new FormData();
  form.append("media", file);
  if (caption?.trim()) form.append("caption", caption.trim());
  // Per-file permission. Every shared file is always viewable, so view_only is always
  // true; "Allow download" is an ADDITIONAL grant on top (view AND download), so it does
  // NOT flip view_only off. Multipart fields are strings → server reads "true"/"false".
  form.append("view_only", "true");
  form.append("download_allowed", String(downloadAllowed));
  // Content-Type undefined so the browser sets multipart/form-data WITH the boundary
  // (a fixed string would omit it and the server's multer couldn't parse) — same pattern
  // as file.service.ts.
  await api.post(API_ENDPOINTS.DEAL_ROOM_SEND_MEDIA(id), form, {
    headers: { "Content-Type": undefined },
  });
}

/** One file shown in the shared-files drawer (mapped from the files-list endpoint). */
export interface SharedFileItem {
  messageId: string;
  name: string;
  /** Size in bytes. */
  size: number;
  kind: "image" | "file";
  s3Key?: string;
  mimeType?: string;
  downloadAllowed: boolean;
  /** Display label for who shared it, e.g. "You" or the counterparty name. */
  by: string;
  /** ISO timestamp. */
  at: string;
}

/** One raw file row from the files-list endpoint (tolerant shape — the list endpoint may
 *  use slightly different field names than `/messages`, so we read a few alternates). */
interface RawSharedFile {
  id?: number | string;
  message_id?: number | string;
  sender_user_id?: number;
  attachment_file_name?: string | null;
  file_name?: string | null;
  attachment_file_size?: number | null;
  file_size?: number | null;
  attachment_s3_key?: string | null;
  s3_key?: string | null;
  attachment_mime_type?: string | null;
  mime_type?: string | null;
  download_allowed?: boolean | string | null;
  view_only?: boolean | string | null;
  created_at?: string;
  sender?: { id?: number; first_name?: string; last_name?: string } | null;
}

/** Map a raw files-list row into a UI SharedFileItem. */
function toSharedFile(raw: RawSharedFile): SharedFileItem {
  const me = getCurrentUserId();
  const mine = me != null && raw.sender_user_id === me;
  const mime = raw.attachment_mime_type ?? raw.mime_type ?? undefined;
  const s3Key = raw.attachment_s3_key ?? raw.s3_key ?? undefined;
  return {
    messageId: String(raw.message_id ?? raw.id ?? ""),
    name: raw.attachment_file_name ?? raw.file_name ?? "file",
    size: raw.attachment_file_size ?? raw.file_size ?? 0,
    kind: mime?.startsWith("image/") ? "image" : "file",
    ...(s3Key ? { s3Key } : {}),
    ...(mime ? { mimeType: mime } : {}),
    downloadAllowed: readDownloadAllowed(raw as unknown as Record<string, unknown>),
    by: mine ? "You" : fullName(raw.sender?.first_name, raw.sender?.last_name) || "—",
    at: raw.created_at ?? "",
  };
}

/** List every file shared in a deal room (shared-files drawer). GET. */
export async function fetchDealRoomFiles(id: string): Promise<SharedFileItem[]> {
  const { data } = await api.get<{ data?: RawSharedFile[] }>(API_ENDPOINTS.DEAL_ROOM_FILES(id));
  return (data.data ?? []).map(toSharedFile).filter((f) => f.messageId !== "");
}
