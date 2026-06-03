"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { COUNTRIES, CONTINENTS, continentForCountry } from "@/lib/countries";
import {
  StartupProfileFields,
  defaultStartupValues,
  type StartupValues,
  type CompleteProfileForm,
} from "@/components/onboarding/StartupProfileFields";
import {
  InvestorProfileFields,
  defaultInvestorValues,
  type InvestorValues,
} from "@/components/onboarding/InvestorProfileFields";
import {
  B2BProfileFields,
  defaultB2BValues,
  type B2BValues,
} from "@/components/onboarding/B2BProfileFields";

/** Human-readable labels for the role values captured at registration. */
const ROLE_LABELS: Record<string, string> = {
  startup: "Startup",
  investor: "Investor",
  b2b_enterprise: "B2B Enterprise",
};

export default function CompleteProfilePage() {
  const { data, setData, goNext } = useOnboarding();
  const [photo, setPhoto] = useState<string | null>(null);

  const role = String(data.role ?? "");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompleteProfileForm>({
    defaultValues: {
      firstName: (data.firstName as string) ?? "",
      lastName: (data.lastName as string) ?? "",
      bio: (data.bio as string) ?? "",
      country: (data.country as string) ?? "",
      continent: (data.continent as string) ?? "",
      startup: { ...defaultStartupValues, ...((data.startup as Partial<StartupValues>) ?? {}) },
      investor: { ...defaultInvestorValues, ...((data.investor as Partial<InvestorValues>) ?? {}) },
      b2b: {
        ...defaultB2BValues,
        // Business Name comes from GST verification later; pre-fill from the
        // company name captured at registration for now.
        businessName: (data.legalName as string) ?? "",
        ...((data.b2b as Partial<B2BValues>) ?? {}),
      },
    },
  });

  const bio = useWatch({ control, name: "bio" });
  const bioChars = (bio ?? "").length;

  const onSubmit = (values: CompleteProfileForm) => {
    setData({
      firstName: values.firstName,
      lastName: values.lastName,
      bio: values.bio,
      country: values.country,
      continent: values.continent,
      ...(role === "startup" ? { startup: values.startup } : {}),
      ...(role === "investor" ? { investor: values.investor } : {}),
      ...(role === "b2b_enterprise" ? { b2b: values.b2b } : {}),
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

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
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
              required
              value={String(data.legalName ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Role"
              required
              value={ROLE_LABELS[role] ?? role}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Email"
              required
              type="email"
              value={String(data.email ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            <Input
              label="Phone"
              required
              type="tel"
              value={String(data.contact ?? "")}
              readOnly
              adornment={<Icon name="lock" size={18} />}
              className="cursor-not-allowed text-on-surface-variant"
            />
            {role === "b2b_enterprise" && (
              <>
                <Input
                  label="GST Number"
                  required
                  value={String(data.gstNumber ?? "")}
                  readOnly
                  adornment={<Icon name="lock" size={18} />}
                  className="cursor-not-allowed text-on-surface-variant"
                />
                <Input
                  label="Company CIN Number"
                  required
                  value={String(data.cinNumber ?? "")}
                  readOnly
                  adornment={<Icon name="lock" size={18} />}
                  className="cursor-not-allowed text-on-surface-variant"
                />
              </>
            )}
          </div>
        </div>

        {/* Personal */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Input id="firstName" label="First Name" required placeholder="e.g. Michael" {...register("firstName")} />
          <Input id="lastName" label="Last Name" required placeholder="e.g. Scott" {...register("lastName")} />
          <Controller
            control={control}
            name="country"
            rules={{ required: "Country is required." }}
            render={({ field }) => (
              <Select
                id="country"
                label="Country"
                required
                placeholder="Select country"
                options={COUNTRIES}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v);
                  setValue("continent", continentForCountry(v));
                }}
                error={errors.country?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="continent"
            render={({ field }) => (
              <Select
                id="continent"
                label="Continent"
                optional
                placeholder="Select continent"
                options={CONTINENTS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {/* Role-specific fields */}
        {role === "startup" && (
          <StartupProfileFields control={control} register={register} errors={errors} />
        )}
        {role === "investor" && (
          <InvestorProfileFields control={control} register={register} setValue={setValue} errors={errors} />
        )}
        {role === "b2b_enterprise" && (
          <B2BProfileFields control={control} register={register} setValue={setValue} errors={errors} />
        )}

        <div className="flex flex-col gap-1">
          <Textarea
            id="bio"
            label="Short Bio"
            optional
            placeholder="Tell us a little bit about what you do..."
            error={errors.bio?.message}
            {...register("bio", {
              maxLength: { value: 300, message: "Keep your bio under 300 characters." },
            })}
          />
          <span className={`px-1 text-xs font-medium ${bioChars > 300 ? "text-error" : "text-on-surface-variant"}`}>
            {bioChars} / 300 characters
          </span>
        </div>

        <div className="flex flex-col gap-4 border-t border-outline/10 pt-6">
          <button type="submit" className="cta-gradient flex h-14 w-full items-center justify-center gap-2 rounded-xl font-bold text-lg text-on-primary shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]">
            Save &amp; Continue
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </form>

    </div>
  );
}
