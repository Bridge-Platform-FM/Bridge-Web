"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ROLE_AVATAR_GRADIENT } from "@/lib/connections";
import { MessageBubble } from "./MessageBubble";
import { DealStageStepper } from "./DealStageStepper";
import { DealSidePanel } from "./DealSidePanel";
import { dayLabel, initials } from "./deal-room-meta";
import { DocumentPreviewModal } from "@/components/onboarding/DocumentPreviewModal";
import type { DealAttachment, DealRoom, PreviewableFile } from "./types";

interface DealRoomChatProps {
  /** The room to render, including its message thread. The parent owns the data source
   *  (REST/socket for the live page, the in-memory store for the demo). */
  room: DealRoom;
  /** Where the back arrow navigates (live vs demo list route). */
  backHref: string;
  /** Send a message: `text` and/or an attached `file`. `downloadAllowed` marks whether the
   *  recipient may download the file (else view-only). The parent persists it (live page
   *  uploads the file / emits the text; demo appends locally). */
  onSendMessage: (text: string, file?: File, downloadAllowed?: boolean) => void;
  /** Close the deal; the parent flips the room to CLOSED. */
  onCloseDeal: () => void;
}

/** A file the user has picked but not sent yet (url is a local preview object URL). */
interface PendingFile {
  name: string;
  size: number;
  kind: DealAttachment["kind"];
  url: string;
  file: File;
  /** Sender's choice: may the recipient download this file? Default false (view-only). */
  downloadAllowed: boolean;
}

/**
 * Presentational workspace for a single deal room — deal header with Close Deal, the
 * 4-stage pipeline stepper, then the chat card (status bar, dated thread, composer) and
 * the side panel. Data-source agnostic: it renders `room` and calls `onSendMessage` /
 * `onCloseDeal`, so the live page (service-backed) and demo page (store-backed) reuse it.
 */
export function DealRoomChat({ room, backHref, onSendMessage, onCloseDeal }: DealRoomChatProps) {
  const router = useRouter();
  const { counterparty: cp } = room;
  const messages = room.messages;
  const closed = room.status === "CLOSED";

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<PendingFile | null>(null);
  // The file currently open in the watermarked preview modal (null = closed).
  const [preview, setPreview] = useState<PreviewableFile | null>(null);
  // Side panel open by default; the chat status-bar arrow collapses it to give the
  // chat full width (and expands it back).
  const [panelOpen, setPanelOpen] = useState(true);
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bring the newest message into view. scrollIntoView on a bottom anchor works whether
  // the thread itself scrolls or (fallback) the outer dashboard container does — so a
  // just-sent message is never left below the fold.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages]);

  const pickFile = (file: File) => {
    const kind: DealAttachment["kind"] = file.type.startsWith("image/") ? "image" : "file";
    // Default to view-only; the sender opts into downloads via the composer toggle.
    setPending({ name: file.name, size: file.size, kind, url: URL.createObjectURL(file), file, downloadAllowed: false });
  };

  const send = () => {
    if (closed) return;
    const text = draft.trim();
    if (!text && !pending) return;

    onSendMessage(text, pending?.file, pending?.downloadAllowed);
    setDraft("");
    setPending(null);
  };

  // Open the watermarked preview modal for a shared file. Needs a server-side s3Key —
  // just-picked / demo attachments (no upload yet) have none, so they're skipped.
  const openPreview = (file: PreviewableFile) => {
    if (!file.s3Key) return;
    setPreview(file);
  };

  const handleClose = () => {
    if (closed) return;
    const ok = window.confirm(`Close the deal with ${cp.name}? You won't be able to send or receive messages.`);
    if (!ok) return;
    onCloseDeal();
  };

  return (
    // h-full (not 100vh) fills the dashboard layout's own scroll container exactly, so
    // ONLY the message thread scrolls — the header + stepper stay pinned. min-h-0 lets
    // the flex children shrink instead of overflowing the page.
    <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col gap-3 p-4 md:gap-4 md:p-6">
      {/* Deal header */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Back to Deal Rooms"
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <Icon name="arrow_back" size={22} />
        </button>

        {/* Counterparty avatar with presence dot */}
        <div className="relative shrink-0">
          <div
            className={`flex size-12 items-center justify-center rounded-full bg-gradient-to-br ${ROLE_AVATAR_GRADIENT[cp.role]} font-headline text-base font-bold text-on-primary`}
          >
            {initials(cp.name)}
          </div>
          <span
            aria-hidden
            className={`absolute right-0 bottom-0 size-3 rounded-full border-2 border-surface ${
              closed ? "bg-outline-variant" : "bg-[#16a34a]"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate font-headline text-lg font-extrabold tracking-[-0.01em] text-on-surface md:text-xl">
            {room.title}
          </p>
          <p className="truncate text-sm text-on-surface-variant">
            with {cp.name}, {cp.title} at {cp.company}
          </p>
        </div>

        {/* Close Deal / Closed badge */}
        {closed ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high px-4 py-2 text-sm font-semibold text-on-surface-variant">
            <Icon name="lock" size={16} />
            Closed
          </span>
        ) : (
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-error px-4 py-2 text-sm font-bold text-on-error shadow-sm transition-opacity hover:opacity-90"
          >
            <Icon name="close" size={16} />
            Close Deal
          </button>
        )}
      </div>

      {/* Deal stage pipeline */}
      <div className="shrink-0">
        <DealStageStepper stage={room.stage} />
      </div>

      {/* Body row: chat (left) + side panel (right, desktop only). The chat card is
          UNCHANGED — it's just wrapped so the side panel can sit beside it. */}
      <div className="flex min-h-0 flex-1 gap-4">
      {/* Chat card — flex-1 + min-h-0 so its inner thread is the scroll region. NOTE: no
          `overflow-hidden` here on purpose: the dashboard nests two scroll containers, and
          if this card's height can't fully resolve, clipping would HIDE newly-sent messages
          below the fold. Leaving it unclipped means messages are always visible (the
          dashboard's own scroller is the fallback). */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        {/* Chat status bar */}
        <div className="flex shrink-0 items-center gap-2 border-b border-outline-variant/30 px-4 py-3">
          <span
            aria-hidden
            className={`size-2 rounded-full ${closed ? "bg-outline-variant" : "bg-[#16a34a]"}`}
          />
          <span className="flex-1 text-sm font-medium text-on-surface">
            {closed ? "Chat is closed" : "Chat is active"}
          </span>
          {/* Expand / collapse the side panel — a plain arrow toggle (collapsing gives the
              chat full width). Wrapped in `hidden md:block` (a confirmed-generated utility)
              because this Tailwind setup doesn't generate `md:inline-flex`/`md:flex`. */}
          <div className="hidden md:block">
            <button
              type="button"
              onClick={() => setPanelOpen((v) => !v)}
              aria-label={panelOpen ? "Expand chat (hide side panel)" : "Show side panel"}
              title={panelOpen ? "Expand chat" : "Show side panel"}
              className="inline-flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <Icon name={panelOpen ? "chevron_right" : "chevron_left"} size={22} />
            </button>
          </div>
        </div>

        {/* Message thread with day dividers — the ONLY scroll region on this page. */}
        <div ref={threadRef} className="thin-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 md:px-6">
          {messages.map((m, i) => {
            const day = dayLabel(m.at);
            const prevDay = i > 0 ? dayLabel(messages[i - 1]!.at) : null;
            return (
              <Fragment key={m.id}>
                {day !== prevDay && (
                  <div className="flex justify-center py-1.5">
                    <span className="rounded-full bg-surface-container-high px-3 py-1 text-[10px] font-bold tracking-[0.12em] text-on-surface-variant uppercase">
                      {day}
                    </span>
                  </div>
                )}
                <MessageBubble message={m} counterparty={cp} onPreview={openPreview} />
              </Fragment>
            );
          })}
          {/* Scroll anchor — the newest message is kept in view via this element. */}
          <div ref={bottomRef} />
        </div>

        {/* Composer — replaced by a notice once the room is closed */}
        {closed ? (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-outline-variant/30 px-4 py-4 text-sm text-on-surface-variant">
            <Icon name="lock" size={18} />
            This deal room is closed. You can no longer send or receive messages.
          </div>
        ) : (
          <div className="shrink-0 border-t border-outline-variant/30 p-3 md:p-4">
            {/* Pending attachment preview + per-file download permission */}
            {pending && (
              <div className="mb-2 rounded-lg bg-surface-container-high px-3 py-2">
                <div className="flex items-center gap-2">
                  <Icon name={pending.kind === "image" ? "image" : "description"} size={20} className="text-on-surface-variant" />
                  <span className="min-w-0 flex-1 truncate text-sm text-on-surface">{pending.name}</span>
                  <button
                    type="button"
                    onClick={() => setPending(null)}
                    aria-label="Remove attachment"
                    className="flex size-6 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface"
                  >
                    <Icon name="close" size={16} />
                  </button>
                </div>

                {/* Segmented toggle: View only (default) vs Allow download. */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-on-surface-variant uppercase">Permission</span>
                  <div className="inline-flex rounded-lg bg-surface-container p-0.5">
                    {([
                      { key: false, label: "View only", icon: "visibility" },
                      { key: true, label: "Allow download", icon: "download" },
                    ] as const).map((opt) => {
                      const active = pending.downloadAllowed === opt.key;
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setPending((p) => (p ? { ...p, downloadAllowed: opt.key } : p))}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-primary text-on-primary shadow-sm"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <Icon name={opt.icon} size={14} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Hidden file input driven by the paperclip inside the field */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pickFile(file);
                  e.target.value = ""; // allow re-picking the same file
                }}
              />

              {/* Input field with the attach button nested on the left, before the text */}
              <div className="flex flex-1 items-end gap-1 rounded-xl bg-surface-container pl-1.5 focus-within:ring-2 focus-within:ring-primary">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Attach file"
                  className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                >
                  <Icon name="attach_file" size={20} />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Type your message…  (Enter to send, Shift+Enter for a new line)"
                  className="max-h-32 min-h-12 flex-1 resize-none bg-transparent py-3 pr-4 text-sm text-on-surface outline-none placeholder:text-on-surface-variant"
                />
              </div>
              <button
                type="button"
                onClick={send}
                disabled={!draft.trim() && !pending}
                aria-label="Send message"
                className="flex size-12 shrink-0 items-center justify-center rounded-xl cta-gradient text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:hover:scale-100"
              >
                <Icon name="send" size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

        {/* Right-hand side panel — Upcoming Meetings, Shared Files. Shown from md up when
            panelOpen; the status-bar arrow toggles it. Its own scroll so long content
            never pushes the chat around. */}
        {panelOpen && (
          <aside className="thin-scrollbar hidden w-72 shrink-0 overflow-y-auto md:block">
            <DealSidePanel room={room} closed={closed} onPreview={openPreview} />
          </aside>
        )}
      </div>

      {/* Watermarked preview modal (shared by chat bubbles + the files drawer). */}
      <DocumentPreviewModal
        s3Key={preview?.s3Key ?? null}
        onClose={() => setPreview(null)}
        title={preview?.name ?? "File Preview"}
        fileName={preview?.name}
        mimeType={preview?.mimeType}
        downloadAllowed={preview?.downloadAllowed ?? false}
        // Hide the browser's native PDF Download/Print toolbar so download is gated
        // solely by our own button (shown only when downloadAllowed).
        hidePdfToolbar
      />
    </div>
  );
}
