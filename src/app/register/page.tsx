"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { registerCompany } from "@/services/auth.service";
import type { ApiError } from "@/lib/axios";

const ROLES = [
  { value: "startup", label: "Startup" },
  { value: "investor", label: "Investor" },
  { value: "b2b_enterprise", label: "B2B Enterprise" },
];

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD =
  "w-full h-14 bg-surface-container-highest border-none rounded-xl px-4 text-on-surface focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-outline-variant";
const FIELD_ERROR = "ring-2 ring-error/60 focus:ring-error/60";
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

    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    // Password is intentionally excluded from the API payload.
    const payload = {
      legalName: values.legalName,
      email: values.email,
      contact: values.contact,
      role,
      gstNumber: isB2B ? values.gstNumber : undefined,
      cinNumber: isB2B ? values.cinNumber : undefined,
    };

    setApiError(null);
    setSubmitting(true);
    try {
      await registerCompany(payload);
      setData(payload);
      goNext("details");
    } catch (err) {
      setApiError((err as ApiError).message ?? "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className=" mx-auto grid max-w-[1200px]  grid-cols-1 items-start gap-16 px-6 py-12 lg:grid-cols-12">
      {/* Left: editorial context */}
      <div className="flex flex-col gap-8 pt-4 lg:col-span-5">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Onboarding
          </span>
          <h1 className="font-headline text-[3.5rem] font-extrabold leading-[1.1] tracking-[-0.03em] text-on-surface">
            Unlock Your <br />
            <span className="text-primary">Enterprise</span> Future.
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-on-surface-variant">
            Join over 5,000 corporate partners streamlining their digital operations with our
            precision-engineered toolset.
          </p>
        </div>
        <div className="flex flex-col gap-6 rounded-2xl bg-surface-container p-8">
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
        <Card padding="lg" className="flex flex-col gap-8 !p-10">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Company Registration</h2>
          </div>
          <StepProgress stepKey="details" />

          <form onSubmit={submit} noValidate className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className={LABEL}>LEGAL COMPANY NAME</label>
              <div className="group relative">
                <input
                  name="legalName"
                  type="text"
                  placeholder="Global Tech Corp"
                  className={`${FIELD} ${errors.legalName ? FIELD_ERROR : ""}`}
                  defaultValue={data.legalName as string}
                  onChange={() => clearError("legalName")}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary opacity-0 transition-opacity group-focus-within:opacity-100">
                  <Icon name="corporate_fare" size={20} />
                </div>
              </div>
              <ErrorText msg={errors.legalName} />
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL}>OFFICIAL EMAIL ADDRESS</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  placeholder="admin@company.com"
                  className={`${FIELD} ${errors.email ? FIELD_ERROR : ""}`}
                  defaultValue={data.email as string}
                  onChange={() => clearError("email")}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Icon name="mail" size={20} />
                </div>
              </div>
              <ErrorText msg={errors.email} />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className={LABEL}>ACCOUNT PASSWORD</label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    className={`${FIELD} ${errors.password ? FIELD_ERROR : ""}`}
                    onChange={() => clearError("password")}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-primary">
                    <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                  </button>
                </div>
                <ErrorText msg={errors.password} />
              </div>
              <div className="flex flex-col gap-2">
                <label className={LABEL}>CONTACT NUMBER</label>
                <div className="relative">
                  <input
                    name="contact"
                    type="tel"
                    placeholder="9632585698"
                    className={`${FIELD} ${errors.contact ? FIELD_ERROR : ""}`}
                    defaultValue={data.contact as string}
                    onChange={() => clearError("contact")}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <Icon name="smartphone" size={20} />
                  </div>
                </div>
                <ErrorText msg={errors.contact} />
              </div>
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
                      className="size-4 border-outline-variant text-primary focus:ring-primary/20"
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
                <div className="flex flex-col gap-2">
                  <label className={LABEL}>GST NUMBER</label>
                  <div className="relative">
                    <input
                      name="gstNumber"
                      type="text"
                      placeholder="22AAAAA0000A1Z5"
                      className={`${FIELD} ${errors.gstNumber ? FIELD_ERROR : ""}`}
                      defaultValue={data.gstNumber as string}
                      onChange={() => clearError("gstNumber")}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      <Icon name="pin" size={20} />
                    </div>
                  </div>
                  <ErrorText msg={errors.gstNumber} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={LABEL}>CIN NUMBER</label>
                  <div className="relative">
                    <input
                      name="cinNumber"
                      type="text"
                      placeholder="U12345MH2024PTC123456"
                      className={`${FIELD} ${errors.cinNumber ? FIELD_ERROR : ""}`}
                      defaultValue={data.cinNumber as string}
                      onChange={() => clearError("cinNumber")}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                      <Icon name="pin" size={20} />
                    </div>
                  </div>
                  <ErrorText msg={errors.cinNumber} />
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 px-1">
              <input type="checkbox" required className="mt-1 size-4 rounded border-outline-variant text-primary focus:ring-primary/20" />
              <span className="text-sm leading-tight text-on-surface-variant">
                I agree to the <Link href="#" className="font-bold text-primary hover:underline">Terms of Service</Link> and{" "}
                <Link href="#" className="font-bold text-primary hover:underline">Privacy Policy</Link> regarding corporate data handling.
              </span>
            </label>

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

        <div className="mt-8 flex justify-center gap-8 font-label text-[11px] font-bold uppercase tracking-widest text-on-surface-variant/60">
          <span className="flex items-center gap-1"><Icon name="lock" size={14} /> SSL Secured</span>
          <span className="flex items-center gap-1"><Icon name="gpp_maybe" size={14} /> GDPR Compliant</span>
          <span className="flex items-center gap-1"><Icon name="public" size={14} /> Global Registration</span>
        </div>
      </div>
    </main>
  );
}
