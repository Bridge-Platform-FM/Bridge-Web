"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { isUserRole } from "@/lib/roles";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/common/loader";
import { DealRoomChat } from "@/components/dashboard/deal-room/DealRoomChat";
import { fetchDealRoom, fetchDealRoomMessages, sendDealMedia } from "@/services/deal-room.service";
import { useDealRoomSocket } from "@/lib/useDealRoomSocket";
import { getCurrentUserId } from "@/lib/jwt";
import type { DealMessage, DealRoom } from "@/components/dashboard/deal-room/types";
import type { ApiError } from "@/lib/axios";

/**
 * Live Deal Room chat — dynamic route /dashboard/deal-room/[dealRoomId]. Loads the room
 * meta + message history over REST, then streams live messages over the socket. TEXT
 * sends go over the socket (`send_message`); the server echoes them back via
 * `new_message`, so we append there (no optimistic double). Renders the shared,
 * presentational `DealRoomChat`.
 *
 * Deferred (later pass): file/media messages (multipart upload + authenticated download),
 * read receipts, typing indicators.
 */
export default function DealRoomChatPage({ params }: { params: Promise<{ dealRoomId: string }> }) {
  const { dealRoomId } = use(params);
  const router = useRouter();
  const { role, isLoaded } = useAuth();
  const [room, setRoom] = useState<DealRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && !isUserRole(role)) router.replace("/dashboard");
  }, [isLoaded, role, router]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchDealRoom(dealRoomId), fetchDealRoomMessages(dealRoomId)])
      .then(([meta, messages]) => {
        if (!meta) {
          setError("This deal room doesn't exist.");
          return;
        }
        setRoom({ ...meta, messages });
      })
      .catch(() => setError("Couldn't load this deal room. Please try again."))
      .finally(() => setLoading(false));
  }, [dealRoomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() drives loading state
    if (isLoaded && isUserRole(role)) load();
  }, [isLoaded, role, load]);

  // Whether the counterparty is currently typing.
  const [counterpartyTyping, setCounterpartyTyping] = useState(false);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Whether the counterparty currently has this deal room open (see onPresenceChange below).
  const [counterpartyOnline, setCounterpartyOnline] = useState(false);

  // Append inbound (and self-echoed) socket messages, de-duplicated by id. A fresh
  // message of mine is delivered-but-unread (single tick) until a `messages_read` arrives.
  const onNewMessage = useCallback((msg: DealMessage) => {
    setRoom((prev) =>
      prev && !prev.messages.some((m) => m.id === msg.id)
        ? { ...prev, messages: [...prev.messages, msg] }
        : prev,
    );
    // Their new message means they're clearly not just-typing anymore.
    if (msg.sender === "them") setCounterpartyTyping(false);
  }, []);

  // The counterparty read the room → mark all MY messages as seen (double blue tick).
  // (mark_read sets read_at on every message where I'm the sender.)
  const onMessagesRead = useCallback((payload: { readBy: number }) => {
    if (payload.readBy === getCurrentUserId()) return;
    setRoom((prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.sender === "me" && !m.read ? { ...m, read: true } : m)) }
        : prev,
    );
  }, []);

  // The other side started/stopped typing. Auto-clear as a safety net if a stop event
  // is ever missed.
  const onUserTyping = useCallback((payload: { userId: number; typing: boolean }) => {
    if (payload.userId === getCurrentUserId()) return;
    setCounterpartyTyping(payload.typing);
    if (typingClearRef.current) clearTimeout(typingClearRef.current);
    if (payload.typing) {
      // Safety net if a `stop_typing` is ever missed. Kept comfortably longer than the
      // sender's ~2s typing heartbeat so an in-flight/late heartbeat can't flicker it off.
      typingClearRef.current = setTimeout(() => setCounterpartyTyping(false), 6000);
    }
  }, []);

  // The counterparty opened/closed this deal room (server sends the current status right
  // after we join, then pushes updates as they join/leave/disconnect).
  const onPresenceChange = useCallback((payload: { userId: number; online: boolean }) => {
    if (payload.userId === getCurrentUserId()) return;
    setCounterpartyOnline(payload.online);
  }, []);

  // A fresh room (or a disconnect) starts from a clean "offline" slate — the server will
  // re-announce the real status once the socket (re)joins.
  useEffect(() => {
    setCounterpartyOnline(false);
  }, [dealRoomId]);

  const { sendMessage, notifyTyping, stopTyping } = useDealRoomSocket(room ? dealRoomId : "", {
    onNewMessage,
    onMessagesRead,
    onUserTyping,
    onPresenceChange,
  });

  if (!isLoaded || !isUserRole(role)) return null;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader size={28} />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Icon name="error" size={40} className="text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">{error ?? "This deal room doesn't exist."}</p>
        <div className="flex gap-2">
          {error && (
            <Button onClick={load} variant="secondary" leadingIcon="refresh">
              Retry
            </Button>
          )}
          <Button href="/dashboard/deal-room" variant="secondary" leadingIcon="arrow_back">
            Back to Deal Rooms
          </Button>
        </div>
      </div>
    );
  }

  // TEXT goes over the socket; a FILE is uploaded via REST. Either way the server
  // broadcasts `new_message` back to the room, so the message renders through the socket
  // handler (no optimistic append / no double).
  const onSendMessage = (text: string, file?: File, downloadAllowed?: boolean) => {
    if (file) {
      sendDealMedia(dealRoomId, file, text, downloadAllowed).catch((err) => {
        toast.error((err as ApiError).message ?? "Couldn't send the file. Please try again.");
      });
    } else {
      sendMessage(text);
    }
  };

  const onCloseDeal = () => {
    setRoom({ ...room, status: "CLOSED" });
  };

  return (
    <DealRoomChat
      room={room}
      backHref="/dashboard/deal-room"
      onSendMessage={onSendMessage}
      onCloseDeal={onCloseDeal}
      counterpartyTyping={counterpartyTyping}
      onTyping={notifyTyping}
      onStopTyping={stopTyping}
      counterpartyOnline={counterpartyOnline}
    />
  );
}
