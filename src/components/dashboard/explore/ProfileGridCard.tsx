"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CompatibilityRing } from "@/components/dashboard/explore/CompatibilityRing";
import {
  ROLE_GRADIENT,
  ROLE_ICON,
  ROLE_LABEL,
  companyInitials,
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
export function ProfileGridCard({
  match,
  onConnect,
  onViewProfile,
}: {
  match: ExploreMatch;
  onConnect: (match: ExploreMatch) => void;
  onViewProfile: (match: ExploreMatch) => void;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const fullName = [match.first_name, match.last_name].filter(Boolean).join(" ").trim();
  const location = formatLocation(match.country, match.continent);
  const facts = roleFacts(match).slice(0, 6);

  const phone = match.country_code && match.mobile_number
    ? `${match.country_code} ${match.mobile_number}`
    : match.mobile_number ?? null;

  return (
    <div className="flex flex-col rounded-2xl border border-outline-variant/40 bg-surface-container-lowest p-5 shadow-sm transition-shadow hover:shadow-md">

      {/* ── Header: avatar · identity · compatibility ── */}
      <div className="flex items-start gap-4">
        {match?.profile_photo && !photoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote portrait, no fixed dimensions
          <img
            src={match.profile_photo}
            alt={fullName || match.organization_name}
            onError={() => setPhotoFailed(true)}
            className="size-16 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div
            className={`flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[match.role]} text-lg font-black text-white`}
          >
            {companyInitials(fullName || match.organization_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-headline text-lg font-bold text-on-surface">
              {fullName || match.organization_name}
            </h3>
            {match.compatibility >= 80 && (
              <Icon name="verified" size={18} filled className="shrink-0 text-secondary" />
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
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
        <CompatibilityRing value={match.compatibility} size={52} className="shrink-0 text-primary" />
      </div>

      {/* ── Bio ── */}
      {match.short_bio && (
        <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{match.short_bio}</p>
      )}

      {/* ── Body: sectors + rationale (left) · role facts (right) ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-outline-variant/30 pt-4 sm:grid-cols-2">

        {/* Left: sectors + rationale */}
        <div className="flex flex-col gap-3">
          <div>
            {/* <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                Primary Sector
              </span>
            </div> */}
            <div className="flex flex-wrap gap-1.5">
              {match?.primary_sector?.map((sector) => (
                <span
                  key={sector}
                  className="rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant"
                >
                  {prettyTag(sector)}
                </span>
              ))}
            </div>
          </div>

          {match.rationale && (
            <div>
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                Reason for suggestion
              </span>
              <span className="inline-block rounded-full bg-surface-container px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                {match.rationale}
              </span>
            </div>
          )}
        </div>

        {/* Right: role-specific facts */}
        {facts.length > 0 && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {facts.map((fact) => (
              <div key={fact?.label} className="min-w-0">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                  {fact?.label}
                </span>
                <span className="block truncate text-xs font-bold text-on-surface">{fact.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Contact info row ── */}
      {(phone || match.company_email || match.company_website_url || match.linkedin_profile_url || match.linkedin_url) && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-outline-variant/30 pt-4">
          {phone && (
            <a
              href={`tel:${match.mobile_number}`}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="call" size={14} />
              <span>{phone}</span>
            </a>
          )}
          {match.company_email && (
            <a
              href={`mailto:${match.company_email}`}
              className="flex items-center gap-1.5 text-xs text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="mail" size={14} />
              <span>{match.company_email}</span>
            </a>
          )}
          {match.company_website_url && (
            <a
              href={match.company_website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="language" size={14} />
              <span>{match.company_website_url.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
          {(match.linkedin_profile_url || match.linkedin_url) && (
            <a
              href={(match.linkedin_profile_url || match.linkedin_url)!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-on-surface-variant transition-colors hover:text-primary"
            >
              <Icon name="link" size={14} />
              <span>LinkedIn</span>
            </a>
          )}
        </div>
      )}

      {/* ── Action ── */}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => onViewProfile(match)}
          className="rounded-xl border border-outline-variant/50 px-5 py-2 text-xs font-bold text-on-surface transition-colors hover:bg-surface-container"
        >
          View Full Profile
        </button>
        <button
          type="button"
          onClick={() => onConnect(match)}
          className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-on-primary transition-transform active:scale-95"
        >
          <Icon name="person_add" size={15} />
          Connect
        </button>
      </div>

    </div>
  );
}
