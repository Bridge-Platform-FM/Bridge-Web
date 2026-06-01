"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import {
  StartupProfileFields,
  defaultStartupValues,
  type StartupValues,
} from "@/components/onboarding/StartupProfileFields";

/** Human-readable labels for the role values captured at registration. */
const ROLE_LABELS: Record<string, string> = {
  startup: "Startup",
  investor: "Investor",
  b2b_enterprise: "B2B Enterprise",
};

/** Role-specific profile fields. Filled in per role; empty arrays render nothing. */
type ProfileField = { name: string; label: string; type?: string; placeholder?: string };
const ROLE_FIELDS: Record<string, ProfileField[]> = {
  investor: [],
  b2b_enterprise: [],
};

export default function CompleteProfilePage() {
  const { data, setData, goNext } = useOnboarding();
  const [photo, setPhoto] = useState<string | null>(null);

  const role = String(data.role ?? "");
  const roleFields = ROLE_FIELDS[role] ?? [];

  const [startup, setStartup] = useState<StartupValues>({
    ...defaultStartupValues,
    ...((data.startup as Partial<StartupValues>) ?? {}),
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    const roleValues = Object.fromEntries(roleFields.map((f) => [f.name, form.get(f.name)]));
    setData({
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      bio: form.get("bio"),
      ...roleValues,
      ...(role === "startup" ? { startup } : {}),
    });
    goNext("profile");
  };

  return (
    <div className="mx-auto my-6 w-full max-w-[560px] rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-3 !p-6 sm:!p-8 lg:gap-6 lg:!p-8">
      <FocusedHeader backLabel="Back to Overview" backHref="/verify-account" />

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface font-headline">
          Complete your profile
        </h1>
        <p className="text-lg text-on-surface-variant">
          Help us personalize your experience by providing a few more details about yourself.
        </p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-6">
        {/* Profile picture */}
        <div className="flex flex-col gap-4">
          <p className="text-base font-semibold text-on-surface">Profile Picture</p>
          <div className="flex items-center gap-6">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-2 border-surface-container-highest bg-surface-container-high">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="Profile preview" className="size-full object-cover" />
              ) : (
                <Icon name="person" size={40} className="text-surface-dim" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <label className="cursor-pointer rounded-lg bg-primary-container px-4 py-2 text-sm font-semibold text-on-primary-container transition-colors hover:bg-primary-fixed-dim">
                  Upload photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPhoto(f ? URL.createObjectURL(f) : null);
                    }}
                  />
                </label>
                <button type="button" onClick={() => setPhoto(null)} className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container">
                  Remove
                </button>
              </div>
              <p className="text-xs text-on-surface-variant">JPG, GIF or PNG. Max size of 800K</p>
            </div>
          </div>
        </div>

        {/* Account details — captured at registration, shown locked */}
        <div className="flex flex-col gap-4">
          <p className="text-base font-semibold text-on-surface">Account Details</p>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Input
              label="Company Name"
              value={String(data.legalName ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Role"
              value={ROLE_LABELS[role] ?? role}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Email"
              type="email"
              value={String(data.email ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Phone"
              type="tel"
              value={String(data.contact ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
          </div>
        </div>

        {/* Personal */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input id="firstName" name="firstName" label="First Name" placeholder="e.g. Michael" defaultValue={data.firstName as string} />
          <Input id="lastName" name="lastName" label="Last Name" placeholder="e.g. Scott" defaultValue={data.lastName as string} />
        </div>

        {/* Role-specific fields */}
        {role === "startup" && (
          <StartupProfileFields value={startup} onChange={setStartup} />
        )}

        {/* Generic scaffold for future roles (investor / b2b) */}
        {roleFields.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-base font-semibold text-on-surface">
              {ROLE_LABELS[role] ?? "Additional"} Details
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {roleFields.map((f) => (
                <Input
                  key={f.name}
                  id={f.name}
                  name={f.name}
                  label={f.label}
                  type={f.type}
                  placeholder={f.placeholder}
                  defaultValue={data[f.name] as string}
                />
              ))}
            </div>
          </div>
        )}

        <Textarea id="bio" name="bio" label="Short Bio (Optional)" placeholder="Tell us a little bit about what you do..." defaultValue={data.bio as string} />

        <div className="flex flex-col gap-4 border-t border-outline/10 pt-6">
          <button type="submit" className="cta-gradient flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-lg text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]">
            Save &amp; Continue
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </form>

      <div className="mt-2 flex items-start gap-4 rounded-2xl bg-surface-container-low p-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
          <Icon name="lock" size={20} filled className="text-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-on-surface">Your data is secure</p>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            We use industry-standard encryption to protect your personal information. Your data will never be shared without your explicit consent.
          </p>
        </div>
      </div>
    </div>
  );
}
