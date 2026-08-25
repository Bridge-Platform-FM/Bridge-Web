"use client";

import React from "react";
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type UseFormRegister,
  type FieldErrors,
} from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
import { DOC_TYPE } from "@/config/docTypes";
import {
  INDUSTRY_SECTORS,
  FUNDING_STAGES,
  TEAM_SIZE_RANGES,
  CURRENCIES,
  INTENT_OPTIONS,
  BUSINESS_DESCRIPTION_MAX_WORDS,
  PITCH_DECK_ACCEPT,
  PITCH_DECK_MAX_MB,
  LINKEDIN_URL_PATTERN,
  URL_REGEX,
} from "@/lib/startup-profile-options";
import type { InvestorValues } from "@/components/onboarding/InvestorProfileFields";
import type { B2BValues } from "@/components/onboarding/B2BProfileFields";

export interface Founder {
  name: string;
  url: string;
}

/** All startup profile field values (everything here is JSON-serializable). */
export interface StartupValues {
  industrySectors: string[];
  fundingStage: string;
  fundingCurrency: string;
  fundingMin: string;
  fundingMax: string;
  useOfFunds: string;
  teamSize: string;
  founders: Founder[];
  businessDescription: string;
  websiteUrl: string;
  linkedinUrl: string;
  intent: string;
  /** S3 keys returned by the scan API once each document is uploaded. */
  incorporationCert: string;
  pitchDeck: string;
}

/** Full react-hook-form shape for the complete-profile page. */
export interface CompleteProfileForm {
  firstName: string;
  lastName: string;
  bio: string;
  country: string;
  continent: string;
  /** Primary Sector — base field shown for every role (multi-select). */
  primarySectors: string[];
  /** Account fields captured at registration — shown locked/read-only here. */
  legalName: string;
  email: string;
  contact: string;
  role: string;
  gstNumber: string;
  cinNumber: string;
  /** Profile photo file name (the object-URL preview is kept in component state). */
  photo: string;
  startup: StartupValues;
  investor: InvestorValues;
  b2b: B2BValues;
}

export const defaultStartupValues: StartupValues = {
  industrySectors: [],
  fundingStage: "",
  fundingCurrency: "INR",
  fundingMin: "",
  fundingMax: "",
  useOfFunds: "",
  teamSize: "",
  founders: [{ name: "", url: "" }],
  businessDescription: "",
  websiteUrl: "",
  linkedinUrl: "",
  intent: "",
  incorporationCert: "",
  pitchDeck: "",
};

/** Word count for the business description (whitespace-delimited). */
export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Truncate `text` to at most `max` whitespace-delimited words. */
export function truncateToWords(text: string, max: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= max) return text;
  return words.slice(0, max).join(" ");
}

/**
 * Builds a textarea `onChange` that hard-caps input at `max` words: it truncates
 * the value in place (so the user cannot type/paste past the limit) and then
 * forwards the event to react-hook-form's own onChange.
 */
export function limitWords(
  max: number,
  rhfOnChange: React.ChangeEventHandler<HTMLTextAreaElement>
): React.ChangeEventHandler<HTMLTextAreaElement> {
  return (e) => {
    const capped = truncateToWords(e.target.value, max);
    if (capped !== e.target.value) e.target.value = capped;
    rhfOnChange(e);
  };
}

interface StartupProfileFieldsProps {
  control: Control<CompleteProfileForm>;
  register: UseFormRegister<CompleteProfileForm>;
  errors: FieldErrors<CompleteProfileForm>;
}

const SECTION_TITLE = "text-base font-semibold text-on-surface";

export function StartupProfileFields({ control, register, errors }: StartupProfileFieldsProps) {
  const e = errors.startup;
  const { fields, append, remove } = useFieldArray({ control, name: "startup.founders" });
  const businessDescription = useWatch({ control, name: "startup.businessDescription" });
  const descWords = wordCount(businessDescription ?? "");
  // Registered once so we can chain RHF's onChange with the hard word-cap below.
  const descReg = register("startup.businessDescription", {
    validate: (v) =>
      wordCount(v) <= BUSINESS_DESCRIPTION_MAX_WORDS ||
      `Keep the description under ${BUSINESS_DESCRIPTION_MAX_WORDS} words.`,
  });

  return (
    <div className="flex flex-col gap-6">
      <p className={SECTION_TITLE}>Startup Details</p>

      <Controller
        control={control}
        name="startup.industrySectors"
        rules={{ validate: (v) => v.length > 0 || "Select at least one industry sector." }}
        render={({ field }) => (
          <Select
            multiple
            id="industrySectors"
            label="Industry Sector"
            required
            placeholder="Select one or more sectors"
            options={INDUSTRY_SECTORS}
            value={field.value}
            onChange={field.onChange}
            error={e?.industrySectors?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Controller
          control={control}
          name="startup.fundingStage"
          render={({ field }) => (
            <Select
              id="fundingStage"
              label="Funding Stage"
              optional
              placeholder="Select stage"
              options={FUNDING_STAGES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="startup.teamSize"
          render={({ field }) => (
            <Select
              id="teamSize"
              label="Team Size"
              optional
              placeholder="Select range"
              options={TEAM_SIZE_RANGES}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      {/* Funding ask: currency + min–max range */}
      <div className="flex flex-col gap-2">
        <span className="px-1 font-label text-xs font-bold tracking-wide text-on-surface-variant">
          Funding Ask Amount<span className="align-middle text-base leading-none text-error"> *</span>
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_1fr]">
          <Controller
            control={control}
            name="startup.fundingCurrency"
            render={({ field }) => (
              <Select aria-label="Currency" options={CURRENCIES} value={field.value} onChange={field.onChange} />
            )}
          />
          <Input
            type="number"
            min={0}
            placeholder="Min"
            error={e?.fundingMin?.message}
            {...register("startup.fundingMin", { required: "Required." })}
          />
          <Input
            type="number"
            min={0}
            placeholder="Max"
            error={e?.fundingMax?.message}
            {...register("startup.fundingMax", {
              required: "Required.",
              validate: (v, all) =>
                Number(v) >= Number(all.startup.fundingMin) || "Max must be ≥ min.",
            })}
          />
        </div>
      </div>

      <Textarea
        id="useOfFunds"
        label="Use of Funds"
        required
        placeholder="How will the funds be used? (e.g. 40% product, 30% hiring, 30% marketing)"
        error={e?.useOfFunds?.message}
        {...register("startup.useOfFunds", { required: "Describe how the funds will be used." })}
      />

      {/* Founders + LinkedIn (repeatable) */}
      <div className="flex flex-col gap-3">
        <span className="px-1 font-label text-xs font-bold tracking-wide text-on-surface-variant">
          Founders &amp; LinkedIn<span className="align-middle text-base leading-none text-error"> *</span>
        </span>
        {fields.map((row, i) => (
          <div key={row.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Input
              placeholder="Founder name"
              error={e?.founders?.[i]?.name?.message}
              {...register(`startup.founders.${i}.name`, { required: "Required." })}
            />
            <Input
              type="url"
              placeholder="https://linkedin.com/in/…"
              error={e?.founders?.[i]?.url?.message}
              {...register(`startup.founders.${i}.url`, {
                required: "Required.",
                pattern: { value: new RegExp(LINKEDIN_URL_PATTERN, "i"), message: "Enter a valid LinkedIn URL." },
              })}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={fields.length === 1}
              aria-label="Remove founder"
              className="flex h-10 w-10 items-center justify-center justify-self-end rounded-lg text-on-surface-variant transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-40 sm:justify-self-auto"
            >
              <Icon name="delete" size={20} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ name: "", url: "" })}
          className="-mt-1.5 flex w-fit items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-primary transition-colors hover:opacity-80"
        >
          <Icon name="add" size={18} /> Add founder
        </button>
      </div>

      {/* Business description with word counter */}
      <div className="flex flex-col gap-1">
        <Textarea
          id="businessDescription"
          label="Business Description"
          optional
          rows={5}
          placeholder="Describe your business, product and traction…"
          error={e?.businessDescription?.message}
          {...descReg}
          onChange={limitWords(BUSINESS_DESCRIPTION_MAX_WORDS, descReg.onChange)}
        />
        <span
          className={`px-1 text-xs font-medium ${
            descWords > BUSINESS_DESCRIPTION_MAX_WORDS ? "text-error" : "text-on-surface-variant"
          }`}
        >
          {descWords} / {BUSINESS_DESCRIPTION_MAX_WORDS} words
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Input
          type="url"
          label="Company Website"
          optional
          placeholder="https://yourcompany.com"
          error={e?.websiteUrl?.message}
          {...register("startup.websiteUrl", {
            validate: (v) => !v || URL_REGEX.test(v) || "Enter a valid URL.",
          })}
        />
        <Input
          type="url"
          label="Company LinkedIn"
          optional
          placeholder="https://linkedin.com/company/…"
          error={e?.linkedinUrl?.message}
          {...register("startup.linkedinUrl", {
            validate: (v) =>
              !v || new RegExp(LINKEDIN_URL_PATTERN, "i").test(v) || "Enter a valid LinkedIn URL.",
          })}
        />
      </div>

      <Controller
        control={control}
        name="startup.intent"
        rules={{ required: "Select your intent." }}
        render={({ field }) => (
          <Select
            id="intent"
            label="Intent"
            required
            placeholder="Select your intent"
            options={INTENT_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            error={e?.intent?.message}
          />
        )}
      />
      {/* document upload uncomment the this block  */}
      
      {/* Mandatory documents */}
      <div className="flex flex-col gap-4">
        <p className={SECTION_TITLE}>Documents</p>
        <Controller
          control={control}
          name="startup.incorporationCert"
          rules={{ validate: (v) => !!v || "Upload your Incorporation Certificate." }}
          render={({ field }) => (
            <FileUploadField
              id="incorporationCert"
              label="Incorporation Certificate"
              required
              scanType="document"
              docType={DOC_TYPE.INCORPORATION_CERTIFICATE}
              error={e?.incorporationCert?.message}
              onChange={(res) => field.onChange(res?.s3Key ?? "")}
            />
          )}
        />
        <Controller
          control={control}
          name="startup.pitchDeck"
          rules={{ validate: (v) => !!v || "Upload your Pitch Deck (PDF, max 20 MB)." }}
          render={({ field }) => (
            <FileUploadField
              id="pitchDeck"
              label="Pitch Deck (PDF, max 20 MB)"
              required
              hint="PDF only (max 20MB)"
              accept={PITCH_DECK_ACCEPT}
              maxSizeMB={PITCH_DECK_MAX_MB}
              scanType="document"
              docType={DOC_TYPE.PITCH_DECK}
              error={e?.pitchDeck?.message}
              onChange={(res) => field.onChange(res?.s3Key ?? "")}
            />
          )}
        />
      </div>
    </div>
  );
}
