/**
 * DEMO-ONLY types for the Deal Room walkthrough. Kept LOCAL to the deal-room feature
 * (deliberately not added to the shared `types/api.types.ts`) so the entire demo is
 * self-contained: deleting the `deal-room/` route + component folders removes the
 * feature without touching any committed/shared code.
 *
 * When this is built for real, promote these to `types/api.types.ts` and back them
 * with the socket/API contract (see the TODO(real) note in DealRoomChat.tsx).
 */

import type { Role } from "@/lib/roles";

/** Room lifecycle. ACTIVE + PAUSED both show under the "Active Deals" tab. */
export type DealRoomStatus = "ACTIVE" | "PAUSED" | "CLOSED";

/** The two list buckets the Active Deals / Closed Deals toggle switches between. */
export type DealRoomTab = "ACTIVE" | "CLOSED";

/** The other party in a deal room (derived from the accepted connection). */
export interface DealCounterparty {
  name: string;
  /** Job title, e.g. "Managing Partner". */
  title: string;
  company: string;
  role: Role;
}

/** A file attached to a message. */
export interface DealAttachment {
  /** Id of the message this attachment belongs to (used as a stable key / lookup). */
  messageId: string;
  name: string;
  /** Size in bytes. */
  size: number;
  /** "image" renders an inline preview; everything else shows a file chip. */
  kind: "image" | "file";
  /** S3 key — passed to the watermarked `/file/file-preview` endpoint for preview/download. */
  s3Key?: string;
  /** MIME type, e.g. "application/pdf" (used to pick the preview renderer). */
  mimeType?: string;
  /** Whether the recipient is allowed to download this file (else view-only). */
  downloadAllowed: boolean;
  /** Local object URL while pending upload (composer only); "" for server messages. */
  url: string;
}

/** The minimal shape needed to open the watermarked preview modal for a shared file.
 *  Satisfied by both `DealAttachment` and the shared-files list rows. */
export interface PreviewableFile {
  name: string;
  s3Key?: string;
  mimeType?: string;
  downloadAllowed: boolean;
}

/** A single chat message inside a room. `sender` is relative to the current user. */
export interface DealMessage {
  id: string;
  /** "me" = current user, "them" = the counterparty. */
  sender: "me" | "them";
  /** Display name of the author (for the counterparty side). */
  authorName: string;
  /** Optional — a message can be just an attachment. */
  text?: string;
  /** Optional attached file. */
  attachment?: DealAttachment;
  /** ISO timestamp. */
  at: string;
  /** For MY ("me") messages only: has the counterparty read it? Drives the delivered
   *  (single tick) vs seen (double blue tick) receipt. Undefined/false = delivered. */
  read?: boolean;
}

/** One deal room = an accepted connection the two parties are progressing. */
export interface DealRoom {
  id: string;
  /** Deal headline shown in the list + chat header, e.g. "Series B Funding — Horizon FinTech". */
  title: string;
  counterparty: DealCounterparty;
  status: DealRoomStatus;
  /** 0-based index into DEAL_STAGES of the stage the deal is currently in. */
  stage: number;
  /** Short summary of the latest event, e.g. "Term sheet revised by Legal". */
  lastActivityNote: string;
  /** Count of unread messages for the current user. */
  unread: number;
  /** ISO timestamp of the most recent activity. */
  lastActivityAt: string;
  messages: DealMessage[];
}
