"use client";

import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { CompatibilityRing } from "@/components/dashboard/explore/CompatibilityRing";
import {
  ROLE_GRADIENT,
  ROLE_ICON,
  ROLE_LABEL,
  companyInitials,
  contactLinks,
  formatLocation,
  prettyTag,
  roleFacts,
} from "@/lib/explore-format";
import type { ExploreMatch } from "@/types/api.types";

/**
 * One match rendered as a static card for the Explore **grid** view. Shows the same
 * Matching Engine data as the swipe card (company, role, compatibility, bio and
 * sector tags), laid out for at-a-glance reading. Adapted from the Stitch
 * "Explore Experts – Entry Grid" screen.
 */
export function ProfileGridCard({ match }: { match: ExploreMatch }) {
  const fullName = [match.first_name, match.last_name].filter(Boolean).join(" ").trim();
  const location = formatLocation(match.country, match.continent);
  const contacts = contactLinks(match);
  const facts = roleFacts(match).slice(0, 4);

  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header: avatar + identity + compatibility */}
      <div className="flex items-start gap-3">
        {match.profile_photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote portrait, no fixed dimensions
          <img
            src={match.profile_photo}
            alt={match.organization_name}
            className="size-14 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[match.role]} text-base font-black text-white`}
          >
            {companyInitials(match.organization_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate font-headline text-base font-bold text-on-surface">
              {fullName || match.organization_name}
            </h3>
            {match.compatibility >= 80 && (
              <Icon name="verified" size={16} filled className="shrink-0 text-secondary" />
            )}
          </div>
          <p className="flex items-center gap-1 text-sm font-semibold text-primary">
            <Icon name={ROLE_ICON[match.role]} size={15} />
            {ROLE_LABEL[match.role]}
            <span className="truncate font-normal text-on-surface-variant">
              · {match.organization_name}
            </span>
          </p>
          {location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
              <Icon name="location_on" size={13} />
              {location}
            </p>
          )}
        </div>
        <CompatibilityRing value={match.compatibility} size={48} className="shrink-0 text-primary" />
      </div>

      {/* Short bio (hidden when the backend sends null) */}
      {match.short_bio && (
        <p className="mt-3 line-clamp-2 text-sm text-on-surface-variant">{match.short_bio}</p>
      )}

      {/* Sector tags */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {match.primary_sector.map((sector) => (
          <span
            key={sector}
            className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant"
          >
            {prettyTag(sector)}
          </span>
        ))}
      </div>

      {/* Role-based details */}
      {facts.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-outline-variant/30 pt-3">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                {fact.label}
              </span>
              <span className="block truncate text-xs font-bold text-on-surface">{fact.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contact links + action */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {contacts.map((c) => (
            <a
              key={c.label}
              href={c.href}
              target="_blank"
              rel="noopener noreferrer"
              title={c.label}
              className="flex size-8 items-center justify-center rounded-full bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-primary"
            >
              <Icon name={c.icon} size={16} />
            </a>
          ))}
        </div>
        <button
          type="button"
          // TODO(api): route to a real profile detail page once it exists.
          onClick={() => toast("Full profile view coming soon")}
          className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary transition-transform active:scale-95"
        >
          View Full Profile
        </button>
      </div>
    </div>
  );
}
