"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Drawer } from "@/components/ui/Drawer";
import { AsyncState } from "@/components/ui/AsyncState";
import { fetchDealRoomFiles, type SharedFileItem } from "@/services/deal-room.service";
import type { ApiError } from "@/lib/axios";
import type { PreviewableFile } from "./types";

/** Human-readable file size, e.g. "1.4 MB". */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SharedFilesDrawerProps {
  open: boolean;
  onClose: () => void;
  dealRoomId: string;
  /** Open the watermarked preview modal for the chosen file. */
  onPreview: (file: PreviewableFile) => void;
}

/**
 * Right-side drawer listing EVERY file shared in a deal room — loaded from the API
 * (`fetchDealRoomFiles`), not the in-chat message subset. Each row opens the shared
 * watermarked preview modal (with download gated by the file's `downloadAllowed`).
 */
export function SharedFilesDrawer({ open, onClose, dealRoomId, onPreview }: SharedFilesDrawerProps) {
  const [files, setFiles] = useState<SharedFileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFiles(await fetchDealRoomFiles(dealRoomId));
    } catch (err) {
      setError((err as ApiError).message ?? "Couldn't load the shared files.");
    } finally {
      setLoading(false);
    }
  }, [dealRoomId]);

  // (Re)load whenever the drawer is opened. load() owns the loading/error state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- state lives in load()
    if (open) load();
  }, [open, load]);

  return (
    <Drawer open={open} onClose={onClose} title="Shared Files" subtitle="All files shared in this deal room" footer={null}>
      <AsyncState
        loading={loading}
        error={error}
        isEmpty={files.length === 0}
        emptyIcon="folder_off"
        emptyText="No files shared yet."
        onRetry={load}
      >
        <ul className="flex flex-col gap-1 p-1">
          {files.map((f) => (
            <li key={f.messageId}>
              <button
                type="button"
                onClick={() => onPreview(f)}
                className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-surface-container-low"
              >
                <Icon name={f.kind === "image" ? "image" : "description"} size={24} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-on-surface">{f.name}</span>
                  <span className="block truncate text-xs text-on-surface-variant">
                    {formatSize(f.size)} · {f.by}
                  </span>
                </span>
                <Icon
                  name={f.downloadAllowed ? "download" : "visibility"}
                  size={16}
                  className="shrink-0 text-on-surface-variant"
                  aria-label={f.downloadAllowed ? "Downloadable" : "View only"}
                />
              </button>
            </li>
          ))}
        </ul>
      </AsyncState>
    </Drawer>
  );
}
