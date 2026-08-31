"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/common/loader";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/modal/Modal";
import { ProfilePreview } from "@/components/onboarding/ProfilePreview";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { COUNTRIES, CONTINENTS, continentForCountry } from "@/lib/countries";
import { PRIMARY_SECTORS } from "@/lib/b2b-profile-options";
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
import type { UserProfilePayload } from "@/types/api.types";
import { toast } from "sonner";
import { buildProfile, getUserProfile, type ProfileField } from "@/services/user.service";
import { scanImage } from "@/services/file.service";
import { DOC_TYPE } from "@/config/docTypes";
import type { ApiError } from "@/lib/axios";

/** Matches the backend's `picUpload` multer config (PNG/JPEG only, 5MB). */
const PHOTO_MIME_TYPES = ["image/png", "image/jpeg"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

/** Hard character cap for the short bio. */
const BIO_MAX_CHARS = 300;

/** Human-readable labels for the role values captured at registration. */
const ROLE_LABELS: Record<string, string> = {
  startup: "Startup",
  investor: "Investor",
  b2b_enterprise: "B2B Enterprise",
};

/** "" → undefined; otherwise the parsed number (or undefined if not finite). */
const toFloat = (v: string): number | undefined => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
};
const toInt = (v: string): number | undefined => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
};

/** Team-size range bucket → min/max ("11-50" → {11,50}; "200+" → {200, undefined}). */
const parseTeamSize = (v: string): { min?: number; max?: number } => {
  if (!v) return {};
  if (v.endsWith("+")) return { min: toInt(v), max: undefined };
  const [min, max] = v.split("-");
  return { min: toInt(min ?? ""), max: toInt(max ?? "") };
};

/** Drop undefined/null, blank strings, and empty arrays so we never send empty keys. */
function prune(obj: UserProfilePayload): UserProfilePayload {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    if (typeof val === "string" && val.trim() === "") continue;
    if (Array.isArray(val) && val.length === 0) continue;
    out[k] = val;
  }
  return out as UserProfilePayload;
}

/** Map the camelCase form values to the backend `user` table columns (snake_case). */
function toUserProfilePayload(values: CompleteProfileForm, role: string): UserProfilePayload {
  const common: UserProfilePayload = {
    first_name: values.firstName,
    last_name: values.lastName,
    profile_photo: values.photo,
    short_bio: values.bio,
    country: values.country,
    continent: values.continent,
    mobile_number: values.contact,
    company_email: values.email,
    primary_sector: values.primarySectors,
  };

  if (role === "startup") {
    const s = values.startup;
    const team = parseTeamSize(s.teamSize);
    return prune({
      ...common,
      organization_name: values.legalName,
      linkedin_profile_url: s.linkedinUrl,
      company_website_url: s.websiteUrl,
      startup_industry_sector: s.industrySectors,
      funding_stage: s.fundingStage,
      funding_currency: s.fundingCurrency,
      funding_ask_amt_min: toFloat(s.fundingMin),
      funding_ask_amt_max: toFloat(s.fundingMax),
      use_of_funds: s.useOfFunds,
      team_size_min: team.min,
      team_size_max: team.max,
      incorporation_certificate: s.incorporationCert,
      pitch_deck_certificate: s.pitchDeck,
      business_description: s.businessDescription,
      startup_intent: s.intent,
    });
  }

  if (role === "investor") {
    const i = values.investor;
    return prune({
      ...common,
      organization_name: values.legalName,
      linkedin_profile_url: i.linkedinUrl,
      company_website_url: i.websiteUrl,
      ticket_size_amt_min: toFloat(i.ticketMin),
      ticket_size_amt_max: toFloat(i.ticketMax),
      prefrerred_investment_stage: i.investmentStages,
      investor_sector_preference: i.sectorPreferences,
      geographic_investment_preference: i.geoCountries,
      investor_type: i.investorType,
      investor_portfolio_overview: i.portfolioOverview,
      number_of_investments_to_date: toInt(i.numberOfInvestments),
      investor_intent: i.primaryIntent,
    });
  }

  if (role === "b2b_enterprise") {
    const b = values.b2b;
    return prune({
      ...common,
      organization_name: b.businessName,
      linkedin_profile_url: b.linkedinUrl,
      company_website_url: b.websiteUrl,
      b2b_sector: b.sector,
      b2b_sub_sector: b.subSector,
      industry_vertical: b.industryVertical,
      revenue_band: b.revenueBand,
      min_order_quantity: toInt(b.moq),
      export_rediness: b.exportReadiness,
      years_in_operation: toFloat(b.yearsInOperation),
      products_ervice_Offered: b.productsServices,
      business_requirements: b.businessRequirements,
      b2b_intent: b.businessIntent,
    });
  }

  return prune(common);
}

/** Reverse of `parseTeamSize`: two numbers back to their bucket ("11-50", "200+"). */
function teamSizeToBucket(min?: number, max?: number): string {
  if (min === undefined) return "";
  const bucket = TEAM_SIZE_RANGES_BY_MIN[min];
  if (!bucket) return "";
  return bucket.max === max ? bucket.value : "";
}
const TEAM_SIZE_RANGES_BY_MIN: Record<number, { value: string; max: number | undefined }> = {
  1: { value: "1-10", max: 10 },
  11: { value: "11-50", max: 50 },
  51: { value: "51-200", max: 200 },
  200: { value: "200+", max: undefined },
};

/** GET /users/profile's array type comes back as a real array, or a JSON/CSV string. */
function fieldToArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* not JSON — fall through to CSV split */ }
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
}
/** Scalar field value → plain string; "" for anything missing/array-shaped. */
function fieldToString(value: string | string[] | undefined): string {
  if (value === undefined || value === null || Array.isArray(value)) return "";
  return String(value);
}

/** Same shape as the form, but every field — including nested role sections — is optional. */
interface ProfilePrefillPatch extends Partial<Omit<CompleteProfileForm, "startup" | "investor" | "b2b">> {
  startup?: Partial<StartupValues>;
  investor?: Partial<InvestorValues>;
  b2b?: Partial<B2BValues>;
}

/**
 * Reverse of `toUserProfilePayload`: turns GET /users/profile's flat, role-configured
 * field list back into the form's (nested, camelCase) shape, so a returning user whose
 * onboarding localStorage never had this data (different browser/device/session — the
 * profile GET is the only reliable source once that's the case) still sees it prefilled.
 * Only fields the backend actually returned are included, so nothing here clobbers a
 * value already present from the registration-wizard's local state.
 */
function buildProfilePrefillPatch(fields: ProfileField[], role: string): ProfilePrefillPatch {
  const byColumn = new Map(fields.map((f) => [f.columnName, f.value]));
  const str = (col: string) => fieldToString(byColumn.get(col));
  const arr = (col: string) => fieldToArray(byColumn.get(col));
  const has = (col: string) => byColumn.has(col) && fieldToString(byColumn.get(col)) !== "";
  const hasArr = (col: string) => byColumn.has(col) && fieldToArray(byColumn.get(col)).length > 0;

  const patch: ProfilePrefillPatch = {};
  if (has("first_name")) patch.firstName = str("first_name");
  if (has("last_name")) patch.lastName = str("last_name");
  if (has("short_bio")) patch.bio = str("short_bio");
  if (has("country")) patch.country = str("country");
  if (has("continent")) patch.continent = str("continent");
  if (hasArr("primary_sector")) patch.primarySectors = arr("primary_sector");
  // Locked "Account Details" fields — GET /users/profile is authoritative here too,
  // so a returning user on a fresh session (no registration-wizard state) still sees
  // the real values instead of a blank locked field.
  if (has("company_email")) patch.email = str("company_email");
  if (has("mobile_number")) patch.contact = str("mobile_number");
  if (has("gst_number")) patch.gstNumber = str("gst_number");
  if (has("cin_number")) patch.cinNumber = str("cin_number");

  const linkedinUrl = str("linkedin_profile_url");
  const websiteUrl = str("company_website_url");

  if (role === "startup") {
    const startup: Partial<StartupValues> = {};
    if (hasArr("startup_industry_sector")) startup.industrySectors = arr("startup_industry_sector");
    if (has("funding_stage")) startup.fundingStage = str("funding_stage");
    if (has("funding_currency")) startup.fundingCurrency = str("funding_currency");
    if (has("funding_ask_amt_min")) startup.fundingMin = str("funding_ask_amt_min");
    if (has("funding_ask_amt_max")) startup.fundingMax = str("funding_ask_amt_max");
    if (has("use_of_funds")) startup.useOfFunds = str("use_of_funds");
    if (has("team_size_min")) {
      const bucket = teamSizeToBucket(toFloat(str("team_size_min")), toFloat(str("team_size_max")));
      if (bucket) startup.teamSize = bucket;
    }
    if (has("incorporation_certificate")) startup.incorporationCert = str("incorporation_certificate");
    if (has("pitch_deck_certificate")) startup.pitchDeck = str("pitch_deck_certificate");
    if (has("business_description")) startup.businessDescription = str("business_description");
    if (has("startup_intent")) startup.intent = str("startup_intent");
    if (linkedinUrl) startup.linkedinUrl = linkedinUrl;
    if (websiteUrl) startup.websiteUrl = websiteUrl;
    if (Object.keys(startup).length > 0) patch.startup = startup;
  }

  if (role === "investor") {
    const investor: Partial<InvestorValues> = {};
    if (has("ticket_size_amt_min")) investor.ticketMin = str("ticket_size_amt_min");
    if (has("ticket_size_amt_max")) investor.ticketMax = str("ticket_size_amt_max");
    if (hasArr("prefrerred_investment_stage")) investor.investmentStages = arr("prefrerred_investment_stage");
    if (hasArr("investor_sector_preference")) investor.sectorPreferences = arr("investor_sector_preference");
    if (hasArr("geographic_investment_preference")) investor.geoCountries = arr("geographic_investment_preference");
    if (has("investor_type")) investor.investorType = str("investor_type");
    if (has("investor_portfolio_overview")) investor.portfolioOverview = str("investor_portfolio_overview");
    if (has("number_of_investments_to_date")) investor.numberOfInvestments = str("number_of_investments_to_date");
    if (has("investor_intent")) investor.primaryIntent = str("investor_intent");
    if (linkedinUrl) investor.linkedinUrl = linkedinUrl;
    if (websiteUrl) investor.websiteUrl = websiteUrl;
    if (Object.keys(investor).length > 0) patch.investor = investor;
  }

  if (role === "b2b_enterprise") {
    const b2b: Partial<B2BValues> = {};
    if (has("organization_name")) b2b.businessName = str("organization_name");
    if (has("b2b_sector")) b2b.sector = str("b2b_sector");
    if (has("b2b_sub_sector")) b2b.subSector = str("b2b_sub_sector");
    if (has("industry_vertical")) b2b.industryVertical = str("industry_vertical");
    if (has("revenue_band")) b2b.revenueBand = str("revenue_band");
    if (has("min_order_quantity")) b2b.moq = str("min_order_quantity");
    if (has("export_rediness")) b2b.exportReadiness = str("export_rediness");
    if (has("years_in_operation")) b2b.yearsInOperation = str("years_in_operation");
    if (has("products_ervice_Offered")) b2b.productsServices = str("products_ervice_Offered");
    if (has("business_requirements")) b2b.businessRequirements = str("business_requirements");
    if (has("b2b_intent")) b2b.businessIntent = str("b2b_intent");
    if (linkedinUrl) b2b.linkedinUrl = linkedinUrl;
    if (websiteUrl) b2b.websiteUrl = websiteUrl;
    if (Object.keys(b2b).length > 0) patch.b2b = b2b;
  }

  return patch;
}

export default function CompleteProfilePage() {
  const { data, setData, goNext } = useOnboarding();
  // Local object URL for the preview circle; the form value holds the uploaded s3Key.
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  // Snapshot of the form taken when Preview is clicked. Captured at click time
  // (not in render) so it reflects the latest values from the uncontrolled inputs.
  const [previewData, setPreviewData] = useState<CompleteProfileForm | null>(null);

  const role = String(data.role ?? "");

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompleteProfileForm>({
    defaultValues: {
      firstName: (data.firstName as string) ?? "",
      lastName: (data.lastName as string) ?? "",
      bio: (data.bio as string) ?? "",
      country: (data.country as string) ?? "",
      continent: (data.continent as string) ?? "",
      primarySectors: (data.primarySectors as string[]) ?? [],
      // Locked account fields captured at registration.
      legalName: (data.legalName as string) ?? "",
      email: (data.email as string) ?? "",
      contact: (data.contact as string) ?? "",
      role: (data.role as string) ?? "",
      gstNumber: (data.gstNumber as string) ?? "",
      cinNumber: (data.cinNumber as string) ?? "",
      photo: "",
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

  // The form above defaults from the registration-wizard's local (localStorage) state,
  // which is empty whenever this page is reached any other way (a returning user on a
  // fresh session/device/browser — see the login-MFA redirect fix). GET /users/profile
  // is the authoritative source once that's the case, so fetch it once on mount and
  // fill in anything the wizard state didn't already have. A first-time visit (nothing
  // saved yet) simply returns empty/no fields, so this is a no-op then.
  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then((res) => {
        if (cancelled) return;
        const patch = buildProfilePrefillPatch(res.data ?? [], role);
        if (Object.keys(patch).length === 0) return;
        const current = getValues();
        reset({
          ...current,
          ...patch,
          startup: { ...current.startup, ...(patch.startup ?? {}) },
          investor: { ...current.investor, ...(patch.investor ?? {}) },
          b2b: { ...current.b2b, ...(patch.b2b ?? {}) },
        });
      })
      .catch(() => {
        // No saved profile yet, or a transient failure — the form still works from
        // whatever the registration-wizard state already had.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: CompleteProfileForm) => {
    // Build the backend-shaped payload (snake_case keys matching the `user` table).
    const profilePayload = toUserProfilePayload(values, role);

    try {
      const res = await buildProfile(profilePayload);
      toast.success(res.message ?? "Profile saved.");
      // Persist UI-shaped fields so prefill keeps working on back-navigation.
      setData({
        firstName: values.firstName,
        lastName: values.lastName,
        bio: values.bio,
        country: values.country,
        continent: values.continent,
        primarySectors: values.primarySectors,
        photo: values.photo,
        ...(role === "startup" ? { startup: values.startup } : {}),
        ...(role === "investor" ? { investor: values.investor } : {}),
        ...(role === "b2b_enterprise" ? { b2b: values.b2b } : {}),
        profilePayload,
      });
      goNext("profile");
    } catch (err) {
      const e = err as ApiError;
      // Surface the first backend field-validation error if present, else the message.
      const fieldErrs = (e.data as { data?: { field: string; message: string }[] } | undefined)?.data;
      toast.error(fieldErrs?.[0]?.message ?? e.message ?? "Couldn't save your profile. Please try again.");
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-[960px] items-center justify-center px-4 py-8">
      <div className="w-full rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-5 !p-6 sm:!p-8">
        <FocusedHeader backLabel="Back to Overview" backHref="/registration/verify-account" />

        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-2xl font-bold leading-tight tracking-tight text-on-surface md:text-3xl">
            Complete your profile
          </h1>
          <p className="text-sm text-on-surface-variant">
            Help us personalize your experience by providing a few more details about yourself.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
          {/* Profile picture */}
          <div className="flex flex-col gap-3">
            <span className="px-1 text-xs font-bold tracking-wide text-on-surface-variant">
              Profile Picture
            </span>
            <div className="flex items-center gap-6">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/30 bg-surface-container-low">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="Profile preview" className="size-full object-cover" />
                ) : (
                  <Icon name="person" size={36} className="text-outline-variant" />
                )}
              </div>
              <Controller
                control={control}
                name="photo"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <label className="cursor-pointer rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container hover:border-outline-variant/60">
                        {photoUploading ? "Uploading…" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          className="hidden"
                          disabled={photoUploading}
                          onChange={async (e) => {
                            const f = e.target.files?.[0] ?? null;
                            // Let the same file be re-picked after a failure.
                            e.target.value = "";
                            if (!f) return;
                            if (!PHOTO_MIME_TYPES.includes(f.type)) {
                              toast.error("Profile photo must be a PNG or JPEG image.");
                              return;
                            }
                            if (f.size > PHOTO_MAX_BYTES) {
                              toast.error("Profile photo must be 5MB or smaller.");
                              return;
                            }
                            setPhotoUploading(true);
                            try {
                              // Same scan+upload pipeline the KYC documents use; the backend
                              // files any non-KYC docType under `company/<id>/<user>/profile/`.
                              const { s3Key } = await scanImage(f, { docType: DOC_TYPE.PROFILE_PHOTO });
                              setPhoto(URL.createObjectURL(f));
                              field.onChange(s3Key);
                            } catch (err) {
                              toast.error((err as ApiError)?.message ?? "Couldn't upload your photo. Please try again.");
                            } finally {
                              setPhotoUploading(false);
                            }
                          }}
                        />
                      </label>
                      {photo && (
                        <button
                          type="button"
                          onClick={() => { setPhoto(null); field.onChange(""); }}
                          className="rounded-lg px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-error"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="px-1 text-xs text-on-surface-variant">JPG, GIF or PNG. Max size of 5MB</p>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Account details — captured at registration, shown locked */}
          <div className="flex flex-col gap-3">
            <span className="px-1 text-xs font-bold tracking-wide text-on-surface-variant">
              Account Details
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="Company Name"
                required
                readOnly
                adornment={<Icon name="lock" size={18} />}
                adornmentClassName="text-outline-variant"
                className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                {...register("legalName")}
              />
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Input
                    label="Role"
                    required
                    readOnly
                    value={ROLE_LABELS[field.value] ?? field.value ?? ""}
                    adornment={<Icon name="lock" size={18} />}
                    adornmentClassName="text-outline-variant"
                    className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                  />
                )}
              />
              <Input
                label="Email"
                required
                type="email"
                readOnly
                adornment={<Icon name="lock" size={18} />}
                adornmentClassName="text-outline-variant"
                className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                {...register("email")}
              />
              <Input
                label="Phone"
                required
                type="tel"
                readOnly
                adornment={<Icon name="lock" size={18} />}
                adornmentClassName="text-outline-variant"
                className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                {...register("contact")}
              />
              {role === "b2b_enterprise" && (
                <>
                  <Input
                    label="GST Number"
                    required
                    readOnly
                    adornment={<Icon name="lock" size={18} />}
                    adornmentClassName="text-outline-variant"
                    className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                    {...register("gstNumber")}
                  />
                  <Input
                    label="CIN Number"
                    required
                    readOnly
                    adornment={<Icon name="lock" size={18} />}
                    adornmentClassName="text-outline-variant"
                    className="cursor-not-allowed !bg-surface-container border-dashed text-on-surface-variant"
                    {...register("cinNumber")}
                  />
                </>
              )}
            </div>
          </div>

          {/* Personal info */}
          <div className="flex flex-col gap-3">
            <span className="px-1 text-xs font-bold tracking-wide text-on-surface-variant">
              Personal Info
            </span>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                id="firstName"
                label="First Name"
                required
                placeholder="e.g. Michael"
                error={errors.firstName?.message}
                adornment={<Icon name="person" size={20} />}
                adornmentClassName="text-primary opacity-0 transition-opacity group-focus-within:opacity-100"
                {...register("firstName", { required: "First name is required." })}
              />
              <Input
                id="lastName"
                label="Last Name"
                required
                placeholder="e.g. Scott"
                error={errors.lastName?.message}
                adornment={<Icon name="person" size={20} />}
                adornmentClassName="text-primary opacity-0 transition-opacity group-focus-within:opacity-100"
                {...register("lastName", { required: "Last name is required." })}
              />
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
          </div>

          {/* Primary Sector */}
          <Controller
            control={control}
            name="primarySectors"
            rules={{ validate: (v) => v.length > 0 || "Select at least one primary sector." }}
            render={({ field }) => (
              <Select
                multiple
                id="primarySectors"
                label="Primary Sector"
                required
                placeholder="Select one or more sectors"
                options={PRIMARY_SECTORS}
                value={field.value}
                onChange={field.onChange}
                error={errors.primarySectors?.message}
              />
            )}
          />

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

          {/* Short Bio */}
          <div className="flex flex-col gap-1">
            <Textarea
              id="bio"
              label="Short Bio"
              optional
              placeholder="Tell us a little bit about what you do..."
              error={errors.bio?.message}
              maxLength={BIO_MAX_CHARS}
              {...register("bio", {
                maxLength: { value: BIO_MAX_CHARS, message: `Keep your bio under ${BIO_MAX_CHARS} characters.` },
              })}
            />
            <span className={`px-1 text-xs font-medium ${bioChars > BIO_MAX_CHARS ? "text-error" : "text-on-surface-variant"}`}>
              {bioChars} / {BIO_MAX_CHARS} characters
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-outline/10 pt-4">
            <button
              type="button"
              onClick={() => setPreviewData(getValues())}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container px-6 text-base font-bold text-on-surface transition-colors hover:bg-surface-container-high"
            >
              <Icon name="visibility" size={18} />
              Preview
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cta-gradient flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none"
            >
              {isSubmitting ? (
                <Loader size={18} />
              ) : (
                <>
                  Save & Continue
                  <Icon name="chevron_right" size={18} />
                </>
              )}
            </button>
          </div>
        </form>

        <Modal open={!!previewData} onClose={() => setPreviewData(null)} title="Profile Preview">
          {previewData && <ProfilePreview values={previewData} photoUrl={photo} role={role} />}
        </Modal>
      </div>
    </main>
  );
}
