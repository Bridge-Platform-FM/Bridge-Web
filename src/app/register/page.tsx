"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm, useWatch, Controller } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/Select";
import { DIAL_CODES } from "@/lib/countries";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { toast } from "sonner";
import { registerCompany } from "@/services/auth.service";
import { setTokens } from "@/lib/auth-tokens";
import type { ApiError } from "@/lib/axios";

const ROLES = [
  { value: "startup", label: "Startup" },
  { value: "investor", label: "Investor" },
  { value: "b2b_enterprise", label: "B2B Enterprise" },
];

// Maps the UI role values to the backend's expected enum.
const ROLE_MAP: Record<string, "INVESTOR" | "B2B" | "STARTUP"> = {
  startup: "STARTUP",
  investor: "INVESTOR",
  b2b_enterprise: "B2B",
};

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LABEL = "text-xs font-bold text-on-surface-variant tracking-wide px-1 font-label";

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

interface RegisterForm {
  legalName: string;
  email: string;
  password: string;
  confirmPassword: string;
  countryCode: string;
  contact: string;
  role: string;
  gstNumber: string;
  cinNumber: string;
  termsAccepted: boolean;
}

export default function RegisterPage() {
  const { data, setData, goNext, reset } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // reset the local storage 
  useEffect(() => {
    reset();
  }, [reset]);

  const {
    register: field,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      legalName: (data.legalName as string) ?? "",
      email: (data.email as string) ?? "",
      password: "",
      confirmPassword: "",
      countryCode: (data.countryCode as string) ?? "+91",
      contact: (data.contact as string) ?? "",
      role: (data.role as string) ?? "",
      gstNumber: (data.gstNumber as string) ?? "",
      cinNumber: (data.cinNumber as string) ?? "",
      termsAccepted: false,
    },
  });

  const passwordVal = watch("password");

  const role = useWatch({ control, name: "role" });
  const isB2B = role === "b2b_enterprise";

  const onSubmit = async (values: RegisterForm) => {
    // Payload shaped to the backend schema (field names, role enum, password, terms).
    const payload = {
      companyName: values.legalName,
      email: values.email,
      // countryCode: values.countryCode,
      // countryCode: values.countryCode, // commented: not sending country code for now
      phoneNumber: values.contact,
      password: values.password,
      role: ROLE_MAP[values.role],
      termsAccepted: true,
      gstNumber: isB2B ? values.gstNumber : undefined,
      cinNumber: isB2B ? values.cinNumber : undefined,
    };

    setApiError(null);
    try {
      const res = await registerCompany(payload);
      // Tokens are issued here now — persist them so all subsequent APIs are authenticated.
      if (res.data?.accessToken && res.data?.refreshToken) {
        setTokens(res.data);
      } else {
        // Backend returned success without tokens — treat as a failure rather than
        // advancing into an unauthenticated flow.
        throw { message: "Registration succeeded but no session was returned. Please try again." } as ApiError;
      }
      toast.success(res.message ?? "Registration successful.");
      // Persist UI-shaped fields so prefill keeps working on back-navigation.
      setData({
        legalName: values.legalName,
        email: values.email,
        countryCode: values.countryCode,
        contact: values.contact,
        role: values.role,
        gstNumber: values.gstNumber,
        cinNumber: values.cinNumber,
      });
      goNext("details");
    } catch (err) {
      setApiError((err as ApiError).message ?? "Registration failed. Please try again.");
    }
  };

  return (
    <main className="mx-auto grid max-w-[1200px] min-h-[calc(100vh-80px)] grid-cols-1 items-center gap-10 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-8">
      {/* Left: editorial context */}
      <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-8">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Onboarding
          </span>
          <h1 className="font-headline text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-on-surface sm:text-4xl lg:text-5xl">
            Unlock Your <br />
            <span className="text-primary">Enterprise</span> Future.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-on-surface-variant sm:text-lg">
            Join over 5,000 corporate partners streamlining their digital operations with our
            precision-engineered toolset.
          </p>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl bg-surface-container p-6 sm:p-8">
          {[
            { icon: "verified_user", title: "Secure Infrastructure", body: "Military-grade encryption for all financial data." },
            { icon: "rocket_launch", title: "Instant Approval", body: "Automated GST verification for faster access." },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                <Icon name={f.icon} size={22} />
              </div>
              <div>
                <p className="font-bold text-on-surface">{f.title}</p>
                <p className="text-sm text-on-surface-variant">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form card */}
      <div className="lg:col-span-7">
        <Card padding="lg" className="flex flex-col gap-3 !p-5 sm:!p-6 lg:gap-3 lg:!p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Company Registration</h2>
          </div>
          {/* <StepProgress stepKey="details" /> */}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <Input
              id="legalName"
              type="text"
              label="Legal Company Name"
              required
              placeholder="Global Tech Corp"
              error={errors.legalName?.message}
              adornment={<Icon name="corporate_fare" size={20} />}
              adornmentClassName="text-primary opacity-0 transition-opacity group-focus-within:opacity-100"
              {...field("legalName", {
                required: "Company name is required.",
                minLength: { value: 3, message: "Company name must be at least 3 characters." },
              })}
            />

            <Input
              id="email"
              type="email"
              label="Official Email Address"
              required
              placeholder="admin@company.com"
              error={errors.email?.message}
              adornment={<Icon name="mail" size={20} />}
              {...field("email", {
                required: "Email is required.",
                pattern: { value: EMAIL_REGEX, message: "Enter a valid email address." },
              })}
            />

            <div className="flex flex-col gap-2">
              <label className={LABEL}>
                Contact Number<span className="align-middle text-base leading-none text-error"> *</span>
              </label>
              <div className={`relative flex h-10 w-full items-center rounded-lg border bg-surface-container-low transition-all duration-200 focus-within:border-primary focus-within:bg-surface-container-lowest focus-within:ring-2 focus-within:ring-primary/10 ${errors.contact?.message ? "border-error/80 ring-2 ring-error/10" : "border-outline-variant/30"
                }`}>
                <div className="w-[4.8rem] shrink-0">
                  <Controller
                    control={control}
                    name="countryCode"
                    render={({ field: cc }) => (
                      <Select
                        aria-label="Country code"
                        searchable
                        placeholder="Code"
                        options={DIAL_CODES}
                        value={cc.value}
                        onChange={cc.onChange}
                        className="flex h-10 w-full items-center justify-between gap-1 bg-transparent px-3 text-left text-sm text-on-surface outline-none cursor-pointer hover:opacity-85"
                        panelClassName="w-72 md:w-80"
                        displayValueOnly
                      />
                    )}
                  />
                </div>
                <div className="h-5 w-px bg-outline-variant/30 shrink-0" />
                 <input
                  id="contact"
                  type="tel"
                  placeholder="9632585698"
                  className="h-full flex-1 bg-transparent px-3 text-sm text-on-surface outline-none placeholder:text-outline-variant"
                  {...field("contact", {
                    required: "Contact number is required.",
                    pattern: { value: PHONE_REGEX, message: "Enter a valid 10-digit mobile number." },
                  })}
                />
                <div className="pr-3 text-on-surface-variant flex items-center shrink-0">
                  <Icon name="smartphone" size={18} />
                </div>
              </div>
              {errors.contact?.message && (
                <span className="px-1 text-xs font-medium text-error">{errors.contact.message}</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="Account Password"
                required
                placeholder="••••••••••••"
                error={errors.password?.message}
                adornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="flex items-center justify-center text-on-surface-variant transition-colors hover:text-primary h-full"
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                }
                {...field("password", {
                  required: "Password is required.",
                  pattern: {
                    value: PASSWORD_REGEX,
                    message: "Min 8 chars with uppercase, lowercase, number and symbol.",
                  },
                })}
              />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm Password"
                required
                placeholder="••••••••••••"
                error={errors.confirmPassword?.message}
                adornment={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="flex items-center justify-center text-on-surface-variant transition-colors hover:text-primary h-full"
                  >
                    <Icon name={showConfirmPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                }
                {...field("confirmPassword", {
                  required: "Please confirm your password.",
                  validate: (val) => val === passwordVal || "Passwords do not match.",
                })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL}>
                Select Your Role<span className="align-middle text-base leading-none text-error"> *</span>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className="flex h-10 cursor-pointer items-center gap-2.5 px-1 transition-all hover:opacity-85"
                  >
                    <input
                      type="radio"
                      value={r.value}
                      className="size-4 cursor-pointer accent-primary border-outline-variant text-primary focus:ring-primary/20"
                      {...field("role", { required: "Please select a role." })}
                    />
                    <span className="text-sm font-medium text-on-surface cursor-pointer select-none">{r.label}</span>
                  </label>
                ))}
              </div>
              <ErrorText msg={errors.role?.message} />
            </div>

            {/* B2B-only: GST + CIN, revealed after role selection */}
            {isB2B && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  id="gstNumber"
                  type="text"
                  label="GST Number"
                  required
                  placeholder="22AAAAA0000A1Z5"
                  error={errors.gstNumber?.message}
                  adornment={<Icon name="pin" size={20} />}
                  {...field("gstNumber", {
                    required: "GST number is required.",
                    validate: (v) => GST_REGEX.test(v.toUpperCase()) || "Enter a valid 15-character GSTIN.",
                  })}
                />
                <Input
                  id="cinNumber"
                  type="text"
                  label="Cin Number"
                  required
                  placeholder="U12345MH2024PTC123456"
                  error={errors.cinNumber?.message}
                  adornment={<Icon name="pin" size={20} />}
                  {...field("cinNumber", {
                    required: "CIN number is required.",
                    validate: (v) => CIN_REGEX.test(v.toUpperCase()) || "Enter a valid 21-character CIN.",
                  })}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-3 px-1">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded accent-primary border-outline-variant text-primary focus:ring-primary/20"
                  {...field("termsAccepted", {
                    required: "Please accept the Terms of Service and Privacy Policy.",
                  })}
                />
                <span className="text-sm leading-tight text-on-surface-variant">
                  I agree to the <Link href="#" className="font-bold text-primary hover:underline">Terms of Service</Link> and{" "}
                  <Link href="#" className="font-bold text-primary hover:underline">Privacy Policy</Link> regarding corporate data handling.<span className="align-middle text-base leading-none text-error"> *</span>
                </span>
              </label>
              <ErrorText msg={errors.termsAccepted?.message} />
            </div>

            {apiError && <ErrorText msg={apiError} />}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cta-gradient flex h-12 w-full items-center justify-center gap-2 bg-primary rounded-xl font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting…" : "Continue"}
              </button>
              <p className="text-center text-sm text-on-surface-variant">
                Already registered? <Link href="#" className="font-bold text-primary hover:underline">Sign in to portal</Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
