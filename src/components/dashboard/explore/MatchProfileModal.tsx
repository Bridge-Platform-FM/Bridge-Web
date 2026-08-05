"use client";

import { useState } from "react";
import { Modal } from "@/components/modal/Modal";
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

/** A titled section inside the profile modal. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-on-surface-variant/70">{title}</h3>
      {children}
    </div>
  );
}

/**
 * Read-only full-profile view for an Explore match. Renders everything the Matching
 * Engine returned (`ExploreMatch`) — identity, bio, rationale, sectors, role-specific
 * facts and contact info — using the shared explore-format helpers. No editing.
 */
export function MatchProfileModal({ match, onClose }: { match: ExploreMatch | null; onClose: () => void }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  if (!match) return null;

  const fullName = [match.first_name, match.last_name].filter(Boolean).join(" ").trim() || match.organization_name;
  const location = formatLocation(match.country, match.continent);
  const facts = roleFacts(match);
  const contacts = contactLinks(match);

  return (
    <Modal open={match !== null} onClose={onClose} title="Profile" maxWidthClass="max-w-2xl">
      <div className="flex flex-col gap-6">
        {/* Identity header */}
        <div className="flex items-start gap-4">
          {match.profile_photo && !photoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote portrait, no fixed dimensions
            <img
              src={match.profile_photo}
              alt={fullName}
              onError={() => setPhotoFailed(true)}
              className="size-20 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div
              className={`flex size-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ROLE_GRADIENT[match.role]} text-2xl font-black text-white`}
            >
              {companyInitials(fullName)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="font-headline text-xl font-bold text-on-surface">{fullName}</h2>
              {match.compatibility >= 80 && <Icon name="verified" size={18} filled className="text-secondary" />}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Icon name={ROLE_ICON[match.role]} size={15} />
              {ROLE_LABEL[match.role]}
              <span className="font-normal text-on-surface-variant">· {match.organization_name}</span>
            </p>
            {location && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-on-surface-variant">
                <Icon name="location_on" size={13} />
                {location}
              </p>
            )}
          </div>
          <CompatibilityRing value={match.compatibility} size={56} className="shrink-0 text-primary" />
        </div>

        {/* Bio */}
        {match.short_bio && (
          <Section title="About">
            <p className="text-sm leading-relaxed text-on-surface-variant">{match.short_bio}</p>
          </Section>
        )}

        {/* Reason for suggestion */}
        {match.rationale && (
          <Section title="Reason for Suggestion">
            <p className="rounded-xl bg-surface-container-low p-3 text-sm leading-relaxed text-on-surface-variant">
              {match.rationale}
            </p>
          </Section>
        )}

        {/* Sectors */}
        {match.primary_sector?.length > 0 && (
          <Section title="Sectors">
            <div className="flex flex-wrap gap-1.5">
              {match.primary_sector.map((sector) => (
                <span
                  key={sector}
                  className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                >
                  {prettyTag(sector)}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* Role-specific details */}
        {facts.length > 0 && (
          <Section title="Details">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0 border-b border-outline-variant/20 pb-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                    {fact.label}
                  </span>
                  <span className="block text-sm font-semibold text-on-surface">{fact.value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Contact */}
        {contacts.length > 0 && (
          <Section title="Contact">
            <div className="flex flex-col gap-2">
              {contacts.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Icon name={c.icon} size={16} className="shrink-0 text-on-surface-variant/70" />
                  <span className="truncate">{c.value}</span>
                </a>
              ))}
            </div>
          </Section>
        )}
      </div>
    </Modal>
  );
}
