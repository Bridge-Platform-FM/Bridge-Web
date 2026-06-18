"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ProfileShortsDeck } from "@/components/dashboard/explore/ProfileShortsDeck";
import { ProfileGridView } from "@/components/dashboard/explore/ProfileGridView";

/**
 * Explore container — owns the view switch between the immersive "Shorts Mode" swipe
 * deck (default) and the browse-all grid. A single floating button toggles between
 * them (on Shorts it offers "Grid", on Grid it offers "Shorts"). Only the active
 * view is mounted, so e.g. the deck's keyboard shortcuts don't fire on the grid.
 */

type ExploreViewMode = "shorts" | "grid";

export function ExploreView() {
  const [view, setView] = useState<ExploreViewMode>("shorts");

  const isShorts = view === "shorts";
  // The button switches to the *other* view.
  const target = isShorts
    ? { label: "Grid", icon: "grid_view", mode: "grid" as const }
    : { label: "Shorts", icon: "view_carousel", mode: "shorts" as const };

  return (
    <div className="relative flex h-full flex-col bg-surface">
      <button
        type="button"
        onClick={() => setView(target.mode)}
        className="absolute right-6 top-4 z-30 flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-surface-container-high"
      >
        <Icon name={target.icon} size={18} />
        {target.label}
      </button>

      <div className="min-h-0 flex-1">
        {isShorts ? <ProfileShortsDeck /> : <ProfileGridView />}
      </div>
    </div>
  );
}
