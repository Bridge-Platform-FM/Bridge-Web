"use client";

import React, { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Textarea } from "@/components/ui/Textarea";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";

const FIELD =
  "w-full h-14 px-4 rounded-xl bg-surface-container-highest border-none text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary/40 transition-all";

export default function CompleteProfilePage() {
  const { data, setData, goNext } = useOnboarding();
  const [photo, setPhoto] = useState<string | null>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.target as HTMLFormElement);
    setData({ firstName: form.get("firstName"), lastName: form.get("lastName"), bio: form.get("bio") });
    goNext("address");
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-8 px-6 py-10">
      <FocusedHeader backLabel="Back to Overview" backHref="/verify-account" />

      <StepProgress stepKey="address" />

      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface font-headline">
          Complete your profile
        </h1>
        <p className="text-lg text-on-surface-variant">
          Help us personalize your experience by providing a few more details about yourself.
        </p>
      </div>

      <form onSubmit={save} className="flex flex-col gap-10">
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

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="firstName" className="ml-1 text-sm font-medium text-on-surface-variant">First Name</label>
            <input id="firstName" name="firstName" type="text" placeholder="e.g. Michael" className={FIELD} defaultValue={data.firstName as string} />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="lastName" className="ml-1 text-sm font-medium text-on-surface-variant">Last Name</label>
            <input id="lastName" name="lastName" type="text" placeholder="e.g. Scott" className={FIELD} defaultValue={data.lastName as string} />
          </div>
        </div>

        <Textarea id="bio" name="bio" label="Short Bio (Optional)" placeholder="Tell us a little bit about what you do..." defaultValue={data.bio as string} />

        <div className="flex flex-col gap-4 border-t border-outline/10 pt-6">
          <button type="submit" className="cta-gradient flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-lg text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]">
            Save &amp; Continue
            <Icon name="chevron_right" size={20} />
          </button>
          <button type="button" onClick={() => goNext("address")} className="h-12 w-full rounded-xl text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container">
            I&apos;ll do this later
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-start gap-4 rounded-2xl bg-surface-container-low p-6">
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
