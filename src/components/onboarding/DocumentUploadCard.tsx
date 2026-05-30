"use client";

import React, { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface DocumentUploadCardProps {
  title: string;
  subtitle: string;
  /** Material Symbols icon for the document badge. */
  icon: string;
  hint?: string;
  /** Pre-uploaded state shows the success badge + filename instead of a dropzone. */
  uploadedName?: string;
  onFileSelected?: (file: File | null) => void;
}

/** Document section per the Stitch "Document Upload" screen: badge header + dropzone or uploaded state. */
export function DocumentUploadCard({
  title,
  subtitle,
  icon,
  hint = "PNG, JPG or PDF (max. 5MB)",
  uploadedName,
  onFileSelected,
}: DocumentUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(uploadedName ?? null);

  const handle = (file: File | null) => {
    setFileName(file?.name ?? null);
    onFileSelected?.(file);
  };

  const uploaded = Boolean(fileName);

  return (
    <section
      className={`mb-8 rounded-2xl p-6 ${uploaded ? "bg-surface-container-lowest ambient-shadow" : "bg-surface-container-low"}`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-xl ${
              uploaded ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            <Icon name={icon} size={22} />
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">{title}</h3>
            <p className="text-sm text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        {uploaded && (
          <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1">
            <Icon name="check_circle" size={14} filled className="text-primary" />
            <span className="text-xs font-bold text-on-secondary-container">UPLOADED</span>
          </span>
        )}
      </div>

      {uploaded ? (
        <div className="flex items-center gap-3 rounded-xl bg-surface-container px-4 py-3 text-sm text-on-surface">
          <Icon name="description" size={20} className="text-primary" />
          <span className="truncate font-medium">{fileName}</span>
          <button
            type="button"
            onClick={() => handle(null)}
            className="ml-auto text-on-surface-variant hover:text-error"
            aria-label="Remove file"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group w-full cursor-pointer rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest/50 transition-colors hover:bg-surface-container-lowest"
        >
          <div className="flex flex-col items-center justify-center px-4 py-12">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary/5 transition-transform group-hover:scale-110">
              <Icon name="upload_file" size={28} className="text-primary" />
            </div>
            <p className="mb-1 text-center font-bold text-on-surface">Click to upload or drag &amp; drop</p>
            <p className="text-center text-xs text-on-surface-variant">{hint}</p>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,application/pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
    </section>
  );
}
