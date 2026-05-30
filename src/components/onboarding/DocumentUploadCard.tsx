"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export interface UploadSlot {
  key: string;
  label: string;
}

interface DocumentUploadCardProps {
  title: string;
  subtitle: string;
  /** Material Symbols icon for the document badge. */
  icon: string;
  hint?: string;
  /** One or more upload slots (e.g. Front Side / Back Side). */
  slots: UploadSlot[];
  /** Fired whenever any slot changes, with the current file per slot key. */
  onChange?: (files: Record<string, File | null>) => void;
}

const ACCEPT = "image/png,image/jpeg,application/pdf";

function isImage(file: File) {
  return file.type.startsWith("image/");
}

/**
 * Document section per the Stitch "Document Upload" screen: badge header +
 * one or more dropzone slots that show an in-box preview once filled.
 */
export function DocumentUploadCard({
  title,
  subtitle,
  icon,
  hint = "PNG, JPG or PDF (max 5MB)",
  slots,
  onChange,
}: DocumentUploadCardProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  // Object URLs for image previews, kept so we can revoke them.
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // Revoke any remaining object URLs on unmount.
  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSlot = (key: string, file: File | null) => {
    // Revoke the previous preview URL for this slot, if any.
    setPreviews((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      const next = { ...prev };
      if (file && isImage(file)) next[key] = URL.createObjectURL(file);
      else delete next[key];
      return next;
    });

    setFiles((prev) => {
      const next = { ...prev, [key]: file };
      onChange?.(next);
      return next;
    });
  };

  const allFilled = slots.every((s) => files[s.key]);

  return (
    <section
      className={`mb-8 rounded-2xl p-6 ${allFilled ? "bg-surface-container-lowest ambient-shadow" : "bg-surface-container-low"}`}
    >
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex size-10 items-center justify-center rounded-xl ${
              allFilled ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container-highest text-on-surface-variant"
            }`}
          >
            <Icon name={icon} size={22} />
          </div>
          <div>
            <h3 className="font-headline text-lg font-bold text-on-surface">{title}</h3>
            <p className="text-sm text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        {allFilled && (
          <span className="flex items-center gap-1.5 rounded-full bg-secondary-container px-3 py-1">
            <Icon name="check_circle" size={14} filled className="text-primary" />
            <span className="text-xs font-bold text-on-secondary-container">UPLOADED</span>
          </span>
        )}
      </div>

      <div className={`grid gap-4 ${slots.length > 1 ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {slots.map((slot) => {
          const file = files[slot.key];
          const previewUrl = previews[slot.key];
          return (
            <div key={slot.key} className="flex flex-col gap-2">
              <span className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                {slot.label}
              </span>

              {file ? (
                <div className="relative h-44 overflow-hidden rounded-xl border-2 border-primary/20 bg-surface-container">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt={`${slot.label} preview`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                      <Icon name="description" size={32} className="text-primary" />
                      <span className="line-clamp-2 text-sm font-medium text-on-surface">{file.name}</span>
                    </div>
                  )}

                  {/* Success badge */}
                  <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Icon name="check" size={16} />
                  </span>

                  {/* Change / remove controls */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputRefs.current[slot.key]?.click()}
                      className="flex items-center gap-1 rounded-full bg-surface-container-lowest/90 px-3 py-1 text-xs font-bold text-on-surface shadow-sm backdrop-blur transition-colors hover:bg-surface-container-lowest"
                    >
                      <Icon name="edit" size={14} /> Change
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlot(slot.key, null)}
                      aria-label="Remove file"
                      className="flex size-7 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-sm backdrop-blur transition-colors hover:text-error"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRefs.current[slot.key]?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dropped = e.dataTransfer.files?.[0];
                    if (dropped) setSlot(slot.key, dropped);
                  }}
                  className="group h-44 w-full cursor-pointer rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-container-lowest/50 transition-colors hover:bg-surface-container-lowest"
                >
                  <div className="flex h-full flex-col items-center justify-center px-4">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/5 transition-transform group-hover:scale-110">
                      <Icon name="upload_file" size={24} className="text-primary" />
                    </div>
                    <p className="mb-1 text-center text-sm font-bold text-on-surface">Click to upload or drag &amp; drop</p>
                    <p className="text-center text-xs text-on-surface-variant">{hint}</p>
                  </div>
                </button>
              )}

              <input
                ref={(el) => {
                  inputRefs.current[slot.key] = el;
                }}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  setSlot(slot.key, e.target.files?.[0] ?? null);
                  // Reset so re-selecting the same file still fires onChange.
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
