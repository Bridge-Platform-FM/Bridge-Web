"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { isUserRole } from "@/lib/roles";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/common/loader";
import { DealRoomChat } from "@/components/dashboard/deal-room/DealRoomChat";
import { closeDealRoom, fetchDealRoom, fetchDealRoomMessages, sendDealMedia } from "@/services/deal-room.service";
import { useDealRoomSocket } from "@/lib/useDealRoomSocket";
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

  // Append inbound (and self-echoed) socket messages, de-duplicated by id.
  const onNewMessage = useCallback((msg: DealMessage) => {
    setRoom((prev) =>
      prev && !prev.messages.some((m) => m.id === msg.id)
        ? { ...prev, messages: [...prev.messages, msg] }
        : prev,
    );
  }, []);

  const { sendMessage } = useDealRoomSocket(room ? dealRoomId : "", { onNewMessage });

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
    const prev = room;
    setRoom({ ...room, status: "CLOSED" }); // optimistic
    closeDealRoom(dealRoomId).catch((err) => {
      setRoom(prev); // revert on failure
      toast.error((err as ApiError).message ?? "Couldn't close the deal. Please try again.");
    });
  };

  return (
    <DealRoomChat
      room={room}
      backHref="/dashboard/deal-room"
      onSendMessage={onSendMessage}
      onCloseDeal={onCloseDeal}
    />
  );
}
