"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { registerCompany } from "@/services/auth.service";
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

type Errors = Record<string, string>;

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

export default function RegisterPage() {
  const { data, setData, goNext } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState((data.role as string) ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const isB2B = role === "b2b_enterprise";

  const clearError = (name: string) =>
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });

  const validate = (values: Record<string, string>): Errors => {
    const e: Errors = {};

    if (!values.legalName.trim()) e.legalName = "Company name is required.";
    else if (values.legalName.trim().length < 3)
      e.legalName = "Company name must be at least 3 characters.";

    if (!values.email.trim()) e.email = "Email is required.";
    else if (!EMAIL_REGEX.test(values.email)) e.email = "Enter a valid email address.";

    if (!values.password) e.password = "Password is required.";
    else if (!PASSWORD_REGEX.test(values.password))
      e.password = "Min 8 chars with uppercase, lowercase, number and symbol.";

    if (!values.contact.trim()) e.contact = "Contact number is required.";
    else if (!PHONE_REGEX.test(values.contact))
      e.contact = "Enter a valid 10-digit mobile number.";

    if (!role) e.role = "Please select a role.";

    if (isB2B) {
      if (!values.gstNumber.trim()) e.gstNumber = "GST number is required.";
      else if (!GST_REGEX.test(values.gstNumber.toUpperCase()))
        e.gstNumber = "Enter a valid 15-character GSTIN.";

      if (!values.cinNumber.trim()) e.cinNumber = "CIN number is required.";
      else if (!CIN_REGEX.test(values.cinNumber.toUpperCase()))
        e.cinNumber = "Enter a valid 21-character CIN.";
    }
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const values = {
      legalName: String(form.get("legalName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      contact: String(form.get("contact") ?? ""),
      gstNumber: String(form.get("gstNumber") ?? ""),
      cinNumber: String(form.get("cinNumber") ?? ""),
    };

    const termsAccepted = form.get("termsAccepted") === "on";

    const found = validate(values);
    if (!termsAccepted)
      found.termsAccepted = "Please accept the Terms of Service and Privacy Policy.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Payload shaped to the backend schema (field names, role enum, password, terms).
    const payload = {
      companyName: values.legalName,
      email: values.email,
      phoneNumber: values.contact,
      password: values.password,
      role: ROLE_MAP[role],
      termsAccepted: true,
      gstNumber: isB2B ? values.gstNumber : undefined,
      cinNumber: isB2B ? values.cinNumber : undefined,
    };

    setApiError(null);
    setSubmitting(true);
    try {
      await registerCompany(payload);
      // Persist UI-shaped fields so prefill (defaultValue) keeps working on back-navigation.
      setData({
        legalName: values.legalName,
        email: values.email,
        contact: values.contact,
        role,
        gstNumber: values.gstNumber,
        cinNumber: values.cinNumber,
      });
      goNext("details");
    } catch (err) {
      setApiError((err as ApiError).message ?? "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className=" mx-auto grid max-w-[1200px]  grid-cols-1 items-start gap-10 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-12">
      {/* Left: editorial context */}
      <div className="flex flex-col gap-6 pt-4 lg:col-span-5 lg:gap-8">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Onboarding
          </span>
          <h1 className="font-headline text-4xl font-extrabold leading-[1.1] tracking-[-0.03em] text-on-surface sm:text-5xl lg:text-[3.5rem]">
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
        <Card padding="lg" className="flex flex-col gap-6 !p-6 sm:!p-8 lg:gap-8 lg:!p-10">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Company Registration</h2>
          </div>
          <StepProgress stepKey="details" />

          <form onSubmit={submit} noValidate className="flex flex-col gap-6">
            <Input
              id="legalName"
              name="legalName"
              type="text"
              label="LEGAL COMPANY NAME"
              placeholder="Global Tech Corp"
              defaultValue={data.legalName as string}
              onChange={() => clearError("legalName")}
              error={errors.legalName}
              adornment={<Icon name="corporate_fare" size={20} />}
              adornmentClassName="text-primary opacity-0 transition-opacity group-focus-within:opacity-100"
            />

            <Input
              id="email"
              name="email"
              type="email"
              label="OFFICIAL EMAIL ADDRESS"
              placeholder="admin@company.com"
              defaultValue={data.email as string}
              onChange={() => clearError("email")}
              error={errors.email}
              adornment={<Icon name="mail" size={20} />}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                label="ACCOUNT PASSWORD"
                placeholder="••••••••••••"
                onChange={() => clearError("password")}
                error={errors.password}
                adornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-on-surface-variant transition-colors hover:text-primary"
                  >
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                }
              />
              <Input
                id="contact"
                name="contact"
                type="tel"
                label="CONTACT NUMBER"
                placeholder="9632585698"
                defaultValue={data.contact as string}
                onChange={() => clearError("contact")}
                error={errors.contact}
                adornment={<Icon name="smartphone" size={20} />}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL}>SELECT YOUR ROLE</label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex h-14 cursor-pointer items-center gap-3 rounded-xl px-4 transition-colors ${
                      role === r.value ? "bg-primary-container" : "bg-surface-container-highest hover:bg-surface-variant"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={role === r.value}
                      onChange={() => {
                        setRole(r.value);
                        clearError("role");
                      }}
                      className="size-4 accent-primary border-outline-variant text-primary focus:ring-primary/20"
                    />
                    <span className="text-sm font-medium text-on-surface">{r.label}</span>
                  </label>
                ))}
              </div>
              <ErrorText msg={errors.role} />
            </div>

            {/* B2B-only: GST + CIN, revealed after role selection */}
            {isB2B && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  id="gstNumber"
                  name="gstNumber"
                  type="text"
                  label="GST NUMBER"
                  placeholder="22AAAAA0000A1Z5"
                  defaultValue={data.gstNumber as string}
                  onChange={() => clearError("gstNumber")}
                  error={errors.gstNumber}
                  adornment={<Icon name="pin" size={20} />}
                />
                <Input
                  id="cinNumber"
                  name="cinNumber"
                  type="text"
                  label="CIN NUMBER"
                  placeholder="U12345MH2024PTC123456"
                  defaultValue={data.cinNumber as string}
                  onChange={() => clearError("cinNumber")}
                  error={errors.cinNumber}
                  adornment={<Icon name="pin" size={20} />}
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-start gap-3 px-1">
                <input type="checkbox" name="termsAccepted" onChange={() => clearError("termsAccepted")} className="mt-1 size-4 rounded accent-primary border-outline-variant text-primary focus:ring-primary/20" />
                <span className="text-sm leading-tight text-on-surface-variant">
                  I agree to the <Link href="#" className="font-bold text-primary hover:underline">Terms of Service</Link> and{" "}
                  <Link href="#" className="font-bold text-primary hover:underline">Privacy Policy</Link> regarding corporate data handling.
                </span>
              </label>
              <ErrorText msg={errors.termsAccepted} />
            </div>

            {apiError && <ErrorText msg={apiError} />}

            <div className="flex flex-col gap-4 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="cta-gradient flex h-14 w-full items-center justify-center gap-2 bg-primary rounded-xl font-headline text-lg font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Continue"}
              </button>
              <p className="text-center text-sm text-on-surface-variant">
                Already registered? <Link href="#" className="font-bold text-primary hover:underline">Sign in to portal</Link>
              </p>
            </div>
          </form>
        </Card>

        <div className="mt-8 flex flex-wrap justify-center gap-4 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60 sm:gap-8">
          <span className="flex items-center gap-1"><Icon name="lock" size={14} /> SSL Secured</span>
          <span className="flex items-center gap-1"><Icon name="gpp_maybe" size={14} /> GDPR Compliant</span>
          <span className="flex items-center gap-1"><Icon name="public" size={14} /> Global Registration</span>
        </div>
      </div>
    </main>
  );
}
