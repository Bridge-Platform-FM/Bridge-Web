"use client";

import { Icon } from "@/components/ui/Icon";
import { DEAL_STAGES, DEAL_STAGE_INFO } from "./deal-room-meta";

// Colours are applied via inline styles, not Tailwind classes: this Tailwind v4 setup
// doesn't reliably generate arbitrary colour utilities (green/hex), so inline is safe.
const GREEN = "#15803d"; // completed stage
const BLUE = "#0c56d0"; // current stage (matches --color-primary)
const TRACK = "#dbe4e7"; // upcoming connector + circle border
const MUTED = "#586064"; // upcoming number + label

// Circle geometry — the connector sits at the circle's vertical centre.
const CIRCLE = 36; // size-9
const BAR = 3;

interface DealStageStepperProps {
  /** 0-based index of the stage the deal is currently in. */
  stage: number;
}

/**
 * The 4-step deal pipeline (LOI Signed → Due Diligence → Term Sheet → Closing).
 *
 * Each stage is an equal-width column with the circle centred at the top; the connector
 * for a column starts at ITS circle's centre (left-1/2) and spans one full column width
 * (w-full) — so it lands exactly on the next circle's centre. Completed segments are
 * fully green, the current segment is part-filled blue, upcoming ones stay grey.
 */
export function DealStageStepper({ stage }: DealStageStepperProps) {
  const last = DEAL_STAGES.length - 1;

  return (
    <div className="rounded-2xl bg-surface-container-low px-4 py-5 sm:px-6">
      <div className="flex">
        {DEAL_STAGES.map((label, i) => {
          const done = i < stage;
          const current = i === stage;

          // Fill of the connector leaving this circle toward the next.
          const fillWidth = i < stage ? "100%" : current ? "45%" : "0%";
          const fillColor = i < stage ? GREEN : BLUE;

          return (
            <div key={label} className="group relative flex flex-1 flex-col items-center">
              {/* Connector: from this circle's centre to the next circle's centre. */}
              {i < last && (
                <span
                  aria-hidden
                  className="absolute left-1/2 w-full overflow-hidden rounded-full"
                  style={{ top: (CIRCLE - BAR) / 2, height: BAR, backgroundColor: TRACK }}
                >
                  <span
                    className="block h-full rounded-full transition-[width] duration-300"
                    style={{ width: fillWidth, backgroundColor: fillColor }}
                  />
                </span>
              )}

              {/* Circle */}
              <span
                className="relative z-10 flex items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  width: CIRCLE,
                  height: CIRCLE,
                  ...(done
                    ? { backgroundColor: GREEN, color: "#fff" }
                    : current
                      ? { backgroundColor: BLUE, color: "#fff", boxShadow: `0 0 0 4px ${BLUE}26` }
                      : { backgroundColor: "#fff", color: MUTED, border: `1.5px solid ${TRACK}` }),
                }}
              >
                {done ? <Icon name="check" size={18} /> : String(i + 1).padStart(2, "0")}
              </span>

              {/* Label */}
              <span
                className="mt-2 text-center text-[10px] font-bold tracking-[0.1em] uppercase sm:text-[11px]"
                style={{ color: done ? GREEN : current ? BLUE : MUTED }}
              >
                {label}
              </span>

              {/* Info tooltip — styled flyout below the label, shown on hover/focus. */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-max max-w-[220px] -translate-x-1/2 scale-95 rounded-lg bg-surface-container-highest px-3 py-2 text-center text-xs font-medium normal-case tracking-normal text-on-surface opacity-0 shadow-lg transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
              >
                {DEAL_STAGE_INFO[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
