"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface FocusedHeaderProps {
  /** Label next to the back arrow. */
  backLabel?: string;
  /** Where Back navigates; defaults to router.back(). */
  backHref?: string;
}

/**
 * Back + brand header used on the focused (steps 2–5) screens. The global
 * Corporate Portal navbar already sits above this; this adds the per-screen
 * "Back" affordance the Stitch designs show.
 */
export function FocusedHeader({ backLabel = "Back", backHref }: FocusedHeaderProps) {
  const router = useRouter();
  return (
    <header className="flex items-center justify-between">
      <button
        type="button"
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        className="flex items-center gap-2 text-on-surface transition-colors hover:text-primary"
      >
        <Icon name="arrow_back" size={20} />
        <span className="font-label text-sm font-semibold">{backLabel}</span>
      </button>
    </header>
  );
}
