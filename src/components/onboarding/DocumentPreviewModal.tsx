"use client";

import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/modal/Modal";
import { Loader } from "@/components/common/loader";
import { useFilePreview } from "@/lib/useFilePreview";

interface DocumentPreviewModalProps {
  /** S3 key of the file to preview; `null` closes the modal. */
  s3Key: string | null;
  onClose: () => void;
  title?: string;
}

/**
 * Click-to-preview dialog for a stored document. Fetches the watermarked server copy
 * by `s3Key` (via `useFilePreview`) and renders it as an image or PDF, with loading
 * and error states. Reused by the document-upload card and the verification-status page.
 */
export function DocumentPreviewModal({ s3Key, onClose, title = "Document Preview" }: DocumentPreviewModalProps) {
  const { url, isPdf, loading, error } = useFilePreview(s3Key);

  return (
    <Modal open={!!s3Key} onClose={onClose} title={title}>
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader size="large" className="text-primary" />
        </div>
      ) : error ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
          <Icon name="error" size={32} className="text-error" />
          <span className="text-sm font-medium text-error">{error}</span>
        </div>
      ) : url ? (
        isPdf ? (
          <iframe src={url} title="Document preview" className="h-[70vh] w-full rounded-lg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Document preview" className="mx-auto max-h-[70vh] w-auto rounded-lg" />
        )
      ) : null}
    </Modal>
  );
}
