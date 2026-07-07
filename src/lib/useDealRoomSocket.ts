"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth-tokens";
import { normalizeMessage, type RawMessage } from "@/services/deal-room.service";
import type { DealMessage } from "@/components/dashboard/deal-room/types";

/**
 * Deal Room real-time socket (Bridge-Server socket.io). Connects to the API host
 * (NEXT_PUBLIC_API_BASE_URL, NOT the /api/v1 path), authenticating with the JWT in the
 * handshake. Joins one deal room, streams inbound `new_message` events, and exposes a
 * `sendMessage(text)` that emits `send_message` (TEXT messages go over the socket, not REST).
 *
 * The server broadcasts `new_message` to EVERYONE in the room including the sender, so a
 * sent message comes back through `onNewMessage` — the caller dedupes by message id and
 * does not optimistically append.
 */
export function useDealRoomSocket(
  dealRoomId: string,
  { onNewMessage }: { onNewMessage: (msg: DealMessage) => void },
) {
  const socketRef = useRef<Socket | null>(null);
  // Keep the latest callback without forcing a reconnect when it changes.
  const onNewMessageRef = useRef(onNewMessage);
  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    if (!dealRoomId) return;
    const token = getAccessToken();
    if (!token) return;

    const url = process.env.NEXT_PUBLIC_API_BASE_URL || undefined;
    const socket = io(url, { auth: { token }, transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join_deal_room", { dealRoomId }));
    socket.on("new_message", (raw: RawMessage) => onNewMessageRef.current(normalizeMessage(raw)));
    socket.on("error", (err: { message?: string }) =>
      toast.error(err?.message ?? "Deal room connection error."),
    );

    return () => {
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

  return { sendMessage };
}
