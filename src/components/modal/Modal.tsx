"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Custom footer; defaults to a single "Close" button when omitted. */
  footer?: React.ReactNode;
  /** Tailwind max-width class for the panel. */
  maxWidthClass?: string;
}

/**
 * Generic, reusable dialog: centered panel with a sticky header (title + ✕),
 * a scrollable body, and a sticky footer. Rendered via a portal to document.body
 * so it escapes any parent stacking/overflow context. Closes on ✕, the default
 * Close button, backdrop click and Escape; locks page scroll while open.
 */
export function Modal({ open, onClose, title, children, footer, maxWidthClass = "max-w-2xl" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll. The actual scroll container is app-specific
    // (here it's <main>), so we toggle a class and let globals.css lock it.
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[85vh] w-full ${maxWidthClass} flex-col rounded-2xl border border-white/40 bg-surface-container-lowest ambient-shadow`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-outline/10 p-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon name="close" size={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="thin-scrollbar flex-1 overflow-y-auto overscroll-contain p-6">{children}</div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-outline/10 p-4">
          {footer ?? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-bold text-on-primary transition-colors hover:bg-primary-dim"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
