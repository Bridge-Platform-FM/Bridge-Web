"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface FileUploadFieldProps {
  label: string;
  /** Accepted MIME types, comma-separated (e.g. "application/pdf"). */
  accept?: string;
  /** Optional max file size in MB; oversize files are rejected. */
  maxSizeMB?: number;
  /** Helper text shown when no file is selected. */
  hint?: string;
  /** Fired with the chosen file (or null when removed / rejected). */
  onChange: (file: File | null) => void;
  /** External error (e.g. "required") shown when there's no internal reject. */
  error?: string;
  /** Enforce a file via native form validation. */
  required?: boolean;
  id?: string;
}

/**
 * Compact single-line file picker: an "Upload" button that shows the selected
 * file name (with a remove control) once a file is chosen. Validates type/size.
 */
export function FileUploadField({
  label,
  accept,
  maxSizeMB,
  hint = "No file chosen",
  onChange,
  error,
  required,
  id,
}: FileUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rejectMsg, setRejectMsg] = useState<string | null>(null);

  const acceptedTypes = (accept ?? "").split(",").map((t) => t.trim()).filter(Boolean);

  const rejectReason = (f: File): string | null => {
    if (acceptedTypes.length && !acceptedTypes.includes(f.type)) return "Unsupported file type.";
    if (maxSizeMB != null && f.size > maxSizeMB * 1024 * 1024) return `File must be ${maxSizeMB} MB or smaller.`;
    return null;
  };

  const choose = (f: File | null) => {
    if (f) {
      const reason = rejectReason(f);
      if (reason) {
        setRejectMsg(reason);
        return;
      }
    }
    setRejectMsg(null);
    setFile(f);
    onChange(f);
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>

      <div className="relative flex items-center gap-3">
        {required && (
          // Focusable, visually-hidden mirror so native form validation enforces a file.
          <input
            tabIndex={-1}
            aria-hidden="true"
            required
            value={file ? file.name : ""}
            onChange={() => {}}
            className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
          />
        )}
        <button
          type="button"
          id={id}
          onClick={() => inputRef.current?.click()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container-highest px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-variant"
        >
          <Icon name="upload_file" size={18} />
          Upload
        </button>

        {file ? (
          <span className="flex min-w-0 items-center gap-2 text-sm text-on-surface">
            <Icon name="description" size={16} className="shrink-0 text-primary" />
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => choose(null)}
              aria-label="Remove file"
              className="flex shrink-0 items-center text-on-surface-variant transition-colors hover:text-error"
            >
              <Icon name="close" size={16} />
            </button>
          </span>
        ) : (
          <span className="truncate text-sm text-on-surface-variant">{hint}</span>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            choose(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </div>

      {(rejectMsg ?? error) && (
        <span className="px-1 text-xs font-medium text-error">{rejectMsg ?? error}</span>
      )}
    </div>
  );
}
