"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth-tokens";
import { normalizeMessage, type RawMessage } from "@/services/deal-room.service";
import type { DealMessage } from "@/components/dashboard/deal-room/types";

/** Payload for the server's `messages_read` broadcast. */
export interface MessagesReadPayload {
  dealRoomId: string | number;
  readBy: number;
}
/** Payload for the server's `user_typing` broadcast. */
export interface UserTypingPayload {
  dealRoomId: string | number;
  userId: number;
  typing: boolean;
}
interface DealRoomSocketHandlers {
  onNewMessage: (msg: DealMessage) => void;
  /** Fired when someone marks the room read (used for "Seen" receipts). */
  onMessagesRead?: (payload: MessagesReadPayload) => void;
  /** Fired when the other participant starts/stops typing. */
  onUserTyping?: (payload: UserTypingPayload) => void;
}

/** How long after the LAST keystroke we auto-emit `stop_typing` (indicator lingers this
 *  long once the other person pauses). */
const TYPING_IDLE_MS = 4000;
/** While typing continuously, re-emit `typing` at most this often so the other side's
 *  auto-clear keeps getting refreshed and the indicator never vanishes mid-typing. */
const TYPING_HEARTBEAT_MS = 2000;

/**
 * Deal Room real-time socket (Bridge-Server socket.io). Connects to the API host
 * (NEXT_PUBLIC_API_BASE_URL, NOT the /api/v1 path), authenticating with the JWT in the
 * handshake. Joins one deal room and handles the full event set:
 *
 * - inbound `new_message` → `onNewMessage` (also auto-emits `mark_read` for messages from
 *   the other side while the tab is visible, so they get read receipts);
 * - inbound `messages_read` → `onMessagesRead` (drives our "Seen" indicator);
 * - inbound `user_typing` → `onUserTyping` (drives the "typing…" indicator);
 * - `sendMessage(text)` emits `send_message`;
 * - `notifyTyping()` / `stopTyping()` emit `typing` / `stop_typing` (throttled — one
 *   `typing` per burst, auto `stop_typing` after {@link TYPING_IDLE_MS} idle).
 *
 * The server broadcasts `new_message` to EVERYONE in the room including the sender, so a
 * sent message comes back through `onNewMessage` — the caller dedupes by message id.
 */
export function useDealRoomSocket(dealRoomId: string, handlers: DealRoomSocketHandlers) {
  const socketRef = useRef<Socket | null>(null);

  // Keep the latest callbacks without forcing a reconnect when they change.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Typing throttle state: whether a `typing` is currently "open", the idle timer, and
  // the timestamp of the last `typing` emit (for the heartbeat).
  const typingActiveRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);

  useEffect(() => {
    if (!dealRoomId) return;
    const token = getAccessToken();
    if (!token) return;

    const url = process.env.NEXT_PUBLIC_API_BASE_URL || undefined;
    const socket = io(url, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_deal_room", { dealRoomId });
      // Opening the room clears any unread messages for me.
      socket.emit("mark_read", { dealRoomId });
    });

    socket.on("new_message", (raw: RawMessage) => {
      const msg = normalizeMessage(raw);
      handlersRef.current.onNewMessage(msg);
      // A message from the other side, seen while the tab is focused, is read immediately.
      if (msg.sender === "them" && (typeof document === "undefined" || document.visibilityState === "visible")) {
        socket.emit("mark_read", { dealRoomId });
      }
    });

    socket.on("messages_read", (payload: MessagesReadPayload) => handlersRef.current.onMessagesRead?.(payload));
    socket.on("user_typing", (payload: UserTypingPayload) => handlersRef.current.onUserTyping?.(payload));

    socket.on("error", (err: { message?: string }) =>
      toast.error(err?.message ?? "Deal room connection error."),
    );

    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingActiveRef.current = false;
      socket.emit("leave_deal_room", { dealRoomId });
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [dealRoomId]);

  /** Send a text message over the socket. */
  const sendMessage = (text: string) => {
    const body = text.trim();
    if (!body) return;
    socketRef.current?.emit("send_message", { dealRoomId, message: body });
  };

  /** Mark all messages in this room as read (drives the other side's "Seen"). */
  const markRead = () => socketRef.current?.emit("mark_read", { dealRoomId });

  /** Tell the other side I stopped typing (idempotent). */
  const stopTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typingActiveRef.current) {
      socketRef.current?.emit("stop_typing", { dealRoomId });
      typingActiveRef.current = false;
    }
  };

  /** Call on each keystroke. Emits `typing` on the first keystroke and then as a
   *  heartbeat (≤ every TYPING_HEARTBEAT_MS) so the other side's indicator stays up while
   *  typing; auto-emits `stop_typing` after TYPING_IDLE_MS of no keystrokes. */
  const notifyTyping = () => {
    if (!socketRef.current) return;
    const now = Date.now();
    if (!typingActiveRef.current || now - lastTypingEmitRef.current >= TYPING_HEARTBEAT_MS) {
      socketRef.current.emit("typing", { dealRoomId });
      typingActiveRef.current = true;
      lastTypingEmitRef.current = now;
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  return { sendMessage, markRead, notifyTyping, stopTyping };
}
