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
import { stageIndexFromValue } from "@/components/dashboard/deal-room/deal-room-meta";
import type { DealAttachment, DealMessage, DealRoom, DealStageRequest, ScheduledMeeting } from "@/components/dashboard/deal-room/types";

/** One flat deal-room row from `GET /deal-rooms` (snake_case, both participants inline). */
interface RawRoom {
  // The backend's `id` column is a Postgres INTEGER, so this actually arrives as a
  // number, not a string — `toDealRoom` coerces it with `String(...)`.
  deal_room_id: number | string;
  title: string | null;
  deal_room_status: string; // "Active" | "Closed"
  deal_room_stage?: string | null; // "Initial Connection" | "Negotiation" | "Due Diligence" | "Closed"
  deal_room_created_at: string;
  requester_user_id: number;
  requester_first_name?: string;
  requester_last_name?: string;
  requester_role_code?: string;
  requester_company_name?: string;
  // `*_country` comes from the `user` table (GET /deal-rooms now joins it). `*_state`
  // doesn't exist anywhere in Bridge-Server's schema — no state/province column on
  // `user` or `company` — so it's always undefined; kept only so formatLocation() still
  // renders a state if that column is ever added.
  requester_state?: string;
  requester_country?: string;
  recipient_user_id: number;
  recipient_first_name?: string;
  recipient_last_name?: string;
  recipient_role_code?: string;
  recipient_company_name?: string;
  recipient_state?: string;
  recipient_country?: string;
}

/** One message row from `GET /deal-rooms/:id/messages` (+ nested sender in history). */
export interface RawMessage {
  id: number;
  deal_room_id?: string;
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
        userId: raw.recipient_user_id,
        name: fullName(raw.recipient_first_name, raw.recipient_last_name),
        company: raw.recipient_company_name ?? "",
        state: raw.recipient_state ?? "",
        country: raw.recipient_country ?? "",
        role: raw.recipient_role_code,
      }
    : {
        userId: raw.requester_user_id,
        name: fullName(raw.requester_first_name, raw.requester_last_name),
        company: raw.requester_company_name ?? "",
        state: raw.requester_state ?? "",
        country: raw.requester_country ?? "",
        role: raw.requester_role_code,
      };

  return {
    // `deal_room_id` comes back as a Postgres integer (deserialized to a JS number), but
    // callers (route params, `fetchDealRoom`) always compare against a string — coerce so
    // `r.id === id` doesn't silently fail.
    id: String(raw.deal_room_id),
    title: raw.title || cp.company || "Deal Room",
    counterparty: {
      userId: cp.userId,
      name: cp.name || cp.company || "—",
      title: "", // backend has no designation field
      company: cp.company,
      state: cp.state,
      country: cp.country,
      role: normalizeRole(cp.role) ?? "startup",
    },
    status: raw.deal_room_status === "Closed" ? "CLOSED" : "ACTIVE",
    stage: stageIndexFromValue(raw.deal_room_stage),
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

/** Raw pending stage-request row (Bridge-Server `DealRoomStageRequest`). */
interface RawStageRequest {
  id: number | string;
  requested_stage: string;
  requested_by_user_id: number;
}

/** The room's currently pending stage-update request, if any. GET — used on load so a
 *  refresh doesn't lose a request that's awaiting a response (the request/respond
 *  themselves are socket-only, see useDealRoomSocket). */
export async function fetchPendingStageRequest(dealRoomId: string): Promise<DealStageRequest | null> {
  const { data } = await api.get<{ data?: RawStageRequest | null }>(
    API_ENDPOINTS.DEAL_ROOM_STAGE_REQUEST_PENDING(dealRoomId),
  );
  const raw = data.data;
  if (!raw) return null;
  return { id: String(raw.id), requestedStage: raw.requested_stage, requestedByUserId: raw.requested_by_user_id };
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

/** Body for `POST /meetings`. */
export interface ScheduleMeetingPayload {
  dealRoomId: string;
  recipientUserId: number;
  title: string;
  agenda: string;
  meetingLink: string;
  /** ISO timestamp. */
  scheduledAt: string;
  duration: string;
}

/** Body for `PUT /meetings/update` — any subset of the editable fields. */
export interface UpdateMeetingPayload {
  title?: string;
  agenda?: string;
  meetingLink?: string;
  /** ISO timestamp. */
  scheduledAt?: string;
  duration?: string;
}

/** Raw meeting row as returned by the meetings endpoints (tolerant of naming variants).
 *  Also matches the `meeting_scheduled` socket broadcast payload — exported for the
 *  socket handler to reuse via `toScheduledMeeting`. */
export interface RawMeeting {
  id?: number | string;
  meeting_id?: number | string;
  meetingId?: number | string;
  title?: string;
  agenda?: string;
  meeting_link?: string;
  meetingLink?: string;
  scheduled_at?: string;
  scheduledAt?: string;
  duration?: string;
  created_by?: number;
  createdBy?: number;
}

/** Pull the meeting array out of a response body, tolerant of the exact envelope shape:
 *  `data: [...]`, a bare array, a nested `data: { meetings/rows/items: [...] }`, or (as
 *  `/meetings/upcoming` actually does) `data: { ...a single meeting row... }`. */
function extractMeetingsArray(body: unknown): RawMeeting[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as RawMeeting[];
    if (obj.data && typeof obj.data === "object") {
      const nested = obj.data as Record<string, unknown>;
      for (const key of ["meetings", "rows", "items", "results"]) {
        if (Array.isArray(nested[key])) return nested[key] as RawMeeting[];
      }
      // A single meeting object, e.g. GET /meetings/upcoming returns just the next one.
      if ("id" in nested || "title" in nested) return [nested as RawMeeting];
    }
  }
  return [];
}

/** Map a raw meeting row into the UI shape. `fallback` fills in gaps for a POST/PUT
 *  response that only echoes back a partial row. Exported so the socket handler can
 *  reuse it for the `meeting_scheduled` broadcast (same shape as the REST responses). */
export function toScheduledMeeting(
  raw: RawMeeting,
  fallback: Partial<ScheduleMeetingPayload> & { createdByMe?: boolean } = {}
): ScheduledMeeting {
  const scheduledAt = raw.scheduled_at ?? raw.scheduledAt ?? fallback.scheduledAt ?? "";
  const createdBy = raw.created_by ?? raw.createdBy;
  const createdByMe = createdBy != null ? createdBy === getCurrentUserId() : (fallback.createdByMe ?? false);
  return {
    id: String(raw.id ?? raw.meeting_id ?? raw.meetingId ?? `m-${Date.now()}`),
    title: raw.title ?? fallback.title ?? "",
    when: scheduledAt
      ? new Date(scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "",
    scheduledAt,
    duration: raw.duration ?? fallback.duration ?? "",
    link: raw.meeting_link ?? raw.meetingLink ?? fallback.meetingLink ?? "",
    agenda: raw.agenda ?? fallback.agenda ?? "",
    createdByMe,
  };
}

/** Schedule a meeting inside a deal room. POST /meetings. */
export async function scheduleMeeting(payload: ScheduleMeetingPayload): Promise<ScheduledMeeting> {
  const { data } = await api.post<{ data?: RawMeeting }>(API_ENDPOINTS.MEETING_CREATE, payload);
  return toScheduledMeeting(data.data ?? {}, { ...payload, createdByMe: true });
}

/** Upcoming meetings for a deal room (panel's inline preview). GET /meetings/upcoming. */
export async function fetchUpcomingMeetings(dealRoomId: string): Promise<ScheduledMeeting[]> {
  const { data } = await api.get<unknown>(API_ENDPOINTS.MEETINGS_UPCOMING(dealRoomId));
  return extractMeetingsArray(data).map((raw) => toScheduledMeeting(raw));
}

/** Every meeting for a deal room ("View All" drawer). GET /meetings. */
export async function fetchAllMeetings(dealRoomId: string): Promise<ScheduledMeeting[]> {
  const { data } = await api.get<unknown>(API_ENDPOINTS.MEETINGS_LIST(dealRoomId));
  return extractMeetingsArray(data).map((raw) => toScheduledMeeting(raw));
}

/** A single meeting's full detail (details modal). GET /meetings/detail. */
export async function fetchMeetingDetail(meetingId: string): Promise<ScheduledMeeting> {
  const { data } = await api.get<{ data?: RawMeeting }>(API_ENDPOINTS.MEETING_DETAIL(meetingId));
  return toScheduledMeeting(data.data ?? {});
}

/** Update a meeting (partial). PUT /meetings/update. */
export async function updateMeeting(meetingId: string, payload: UpdateMeetingPayload): Promise<ScheduledMeeting> {
  const { data } = await api.put<{ data?: RawMeeting }>(API_ENDPOINTS.MEETING_UPDATE(meetingId), payload);
  return toScheduledMeeting(data.data ?? {}, { ...payload, createdByMe: true });
}
