"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
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
} from "@/lib/startup-profile-options";

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
  /** File names captured from the upload cards (actual File kept in the card). */
  incorporationCert: string;
  pitchDeck: string;
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

interface StartupProfileFieldsProps {
  value: StartupValues;
  onChange: (next: StartupValues) => void;
}

const SECTION_TITLE = "text-base font-semibold text-on-surface";

export function StartupProfileFields({ value, onChange }: StartupProfileFieldsProps) {
  const set = <K extends keyof StartupValues>(key: K, v: StartupValues[K]) => {
    onChange({ ...value, [key]: v });
  };

  const setFounder = (i: number, patch: Partial<Founder>) => {
    const founders = value.founders.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    onChange({ ...value, founders });
  };
  const addFounder = () => onChange({ ...value, founders: [...value.founders, { name: "", url: "" }] });
  const removeFounder = (i: number) =>
    onChange({ ...value, founders: value.founders.filter((_, idx) => idx !== i) });

  const descWords = wordCount(value.businessDescription);

  return (
    <div className="flex flex-col gap-6">
      <p className={SECTION_TITLE}>Startup Details</p>

      <Select
        multiple
        required
        id="industrySectors"
        label="Industry Sector"
        placeholder="Select one or more sectors"
        options={INDUSTRY_SECTORS}
        value={value.industrySectors}
        onChange={(v) => set("industrySectors", v)}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Select
          id="fundingStage"
          label="Funding Stage"
          placeholder="Select stage"
          options={FUNDING_STAGES}
          value={value.fundingStage}
          onChange={(v) => set("fundingStage", v)}
        />
        <Select
          id="teamSize"
          label="Team Size"
          placeholder="Select range"
          options={TEAM_SIZE_RANGES}
          value={value.teamSize}
          onChange={(v) => set("teamSize", v)}
        />
      </div>

      {/* Funding ask: currency + min–max range */}
      <div className="flex flex-col gap-2">
        <span className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Funding Ask Amount
        </span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr_1fr]">
          <Select
            aria-label="Currency"
            options={CURRENCIES}
            value={value.fundingCurrency}
            onChange={(v) => set("fundingCurrency", v)}
          />
          <Input
            type="number"
            min={0}
            required
            placeholder="Min"
            value={value.fundingMin}
            onChange={(e) => set("fundingMin", e.target.value)}
          />
          <Input
            type="number"
            min={0}
            required
            placeholder="Max"
            value={value.fundingMax}
            onChange={(e) => set("fundingMax", e.target.value)}
          />
        </div>
      </div>

      <Textarea
        id="useOfFunds"
        label="Use of Funds"
        required
        placeholder="How will the funds be used? (e.g. 40% product, 30% hiring, 30% marketing)"
        value={value.useOfFunds}
        onChange={(e) => set("useOfFunds", e.target.value)}
      />

      {/* Founders + LinkedIn (repeatable) */}
      <div className="flex flex-col gap-3">
        <span className="px-1 font-label text-xs font-bold uppercase tracking-wide text-on-surface-variant">
          Founders &amp; LinkedIn
        </span>
        {value.founders.map((f, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <Input
              required
              placeholder="Founder name"
              value={f.name}
              onChange={(e) => setFounder(i, { name: e.target.value })}
            />
            <Input
              type="url"
              required
              pattern={LINKEDIN_URL_PATTERN}
              title="Enter a valid LinkedIn URL (https://linkedin.com/…)"
              placeholder="https://linkedin.com/in/…"
              value={f.url}
              onChange={(e) => setFounder(i, { url: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeFounder(i)}
              disabled={value.founders.length === 1}
              aria-label="Remove founder"
              className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface-container-highest text-on-surface-variant transition-colors hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="delete" size={20} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addFounder}
          className="flex w-fit items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-primary transition-colors hover:underline"
        >
          <Icon name="add" size={18} /> Add founder
        </button>
      </div>

      {/* Business description with word counter */}
      <div className="flex flex-col gap-1">
        <Textarea
          id="businessDescription"
          label="Business Description"
          rows={5}
          placeholder="Describe your business, product and traction…"
          value={value.businessDescription}
          onChange={(e) => set("businessDescription", e.target.value)}
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
          label="Company Website (optional)"
          placeholder="https://yourcompany.com"
          value={value.websiteUrl}
          onChange={(e) => set("websiteUrl", e.target.value)}
        />
        <Input
          type="url"
          pattern={LINKEDIN_URL_PATTERN}
          title="Enter a valid LinkedIn URL (https://linkedin.com/…)"
          label="Company LinkedIn (optional)"
          placeholder="https://linkedin.com/company/…"
          value={value.linkedinUrl}
          onChange={(e) => set("linkedinUrl", e.target.value)}
        />
      </div>

      <Select
        required
        id="intent"
        label="Intent"
        placeholder="Select your intent"
        options={INTENT_OPTIONS}
        value={value.intent}
        onChange={(v) => set("intent", v)}
      />

      {/* Mandatory documents */}
      <div className="flex flex-col gap-4">
        <p className={SECTION_TITLE}>Documents</p>
        <FileUploadField
          id="incorporationCert"
          label="Incorporation Certificate"
          required
          onChange={(f) => set("incorporationCert", f?.name ?? "")}
        />
        <FileUploadField
          id="pitchDeck"
          label="Pitch Deck (PDF, max 20 MB)"
          hint="PDF only (max 20MB)"
          accept={PITCH_DECK_ACCEPT}
          maxSizeMB={PITCH_DECK_MAX_MB}
          required
          onChange={(f) => set("pitchDeck", f?.name ?? "")}
        />
      </div>
    </div>
  );
}
