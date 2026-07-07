"use client";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/modal/Modal";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/common/loader";
import { useFilePreview } from "@/lib/useFilePreview";

interface DocumentPreviewModalProps {
  /** S3 key of the file to preview; `null` closes the modal. */
  s3Key: string | null;
  onClose: () => void;
  title?: string;
  /** When true, show a Download button (saves the watermarked preview copy). Default false. */
  downloadAllowed?: boolean;
  /** File name used for the download and the "not previewable" fallback. */
  fileName?: string;
  /** MIME type of the file. When it isn't an image or PDF, an inline preview can't be
   *  rendered and a fallback is shown instead. Omit to keep the legacy image/PDF behavior. */
  mimeType?: string;
  /** Hide the browser's built-in PDF viewer toolbar (Download/Print). Use this so a
   *  view-only file can't be saved from the native toolbar — download is then only
   *  possible via our own gated button. Default false (keeps the native toolbar). */
  hidePdfToolbar?: boolean;
}

/**
 * Click-to-preview dialog for a stored document. Fetches the watermarked server copy
 * by `s3Key` (via `useFilePreview`) and renders it as an image or PDF, with loading
 * and error states. Reused by the document-upload card, verification-status page, KYC
 * review, and the deal-room shared files (with a conditional download button).
 */
export function DocumentPreviewModal({
  s3Key,
  onClose,
  title = "Document Preview",
  downloadAllowed = false,
  fileName,
  mimeType,
  hidePdfToolbar = false,
}: DocumentPreviewModalProps) {
  const { url, isPdf, loading, error } = useFilePreview(s3Key);

  // Chromium honors these fragment params to hide the embedded PDF viewer's toolbar
  // (Download/Print). Applied when the caller wants to prevent saving from the native UI.
  const pdfSrc = url && hidePdfToolbar ? `${url}#toolbar=0&navpanes=0&scrollbar=0` : url;

  // Only images and PDFs can be rendered inline. If a mimeType is provided and it's
  // neither, show a fallback instead of a broken <img>. When mimeType is omitted (legacy
  // callers like KYC), keep the original isPdf-based image/PDF behavior.
  const isImage = mimeType ? mimeType.startsWith("image/") : true;
  const canRenderInline = isPdf || isImage;

  // Download the already-fetched watermarked blob (no extra request) via a transient
  // anchor — avoids routing the blob: URL through Next's <Link>. Shown only when the
  // sender allowed downloads for this file.
  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const footer =
    downloadAllowed && url ? (
      <Button variant="secondary" leadingIcon="download" onClick={handleDownload}>
        Download
      </Button>
    ) : undefined;

  return (
    <Modal open={!!s3Key} onClose={onClose} title={title} footer={footer}>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader size="large" className="text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <Icon name="error" size={32} className="text-error" />
          <span className="text-sm font-medium text-error">{error}</span>
        </div>
      ) : url && canRenderInline ? (
        isPdf ? (
          <iframe src={pdfSrc ?? undefined} title="Document preview" className="h-[70vh] w-full rounded-lg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Document preview" className="mx-auto max-h-[70vh] w-auto rounded-lg" />
        )
      ) : url ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
          <Icon name="description" size={40} className="text-on-surface-variant" />
          <span className="text-sm font-medium text-on-surface">{fileName || "This file"}</span>
          <span className="text-xs text-on-surface-variant">
            Preview isn&apos;t available for this file type.
            {downloadAllowed ? " Use Download to open it." : " It is view-only."}
          </span>
        </div>
      ) : null}
    </Modal>
  );
}
