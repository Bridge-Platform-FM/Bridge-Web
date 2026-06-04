"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { toast } from "sonner";
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

function ErrorText({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <span className="px-1 text-xs font-medium text-error">{msg}</span>;
}

interface RegisterForm {
  legalName: string;
  email: string;
  password: string;
  contact: string;
  role: string;
  gstNumber: string;
  cinNumber: string;
  termsAccepted: boolean;
}

export default function RegisterPage() {
  const { data, setData, goNext } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register: field,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    defaultValues: {
      legalName: (data.legalName as string) ?? "",
      email: (data.email as string) ?? "",
      password: "",
      contact: (data.contact as string) ?? "",
      role: (data.role as string) ?? "",
      gstNumber: (data.gstNumber as string) ?? "",
      cinNumber: (data.cinNumber as string) ?? "",
      termsAccepted: false,
    },
  });

  const role = useWatch({ control, name: "role" });
  const isB2B = role === "b2b_enterprise";

  const onSubmit = async (values: RegisterForm) => {
    // Payload shaped to the backend schema (field names, role enum, password, terms).
    const payload = {
      companyName: values.legalName,
      email: values.email,
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
      toast.success(res.message ?? "Registration successful.");
      // Persist UI-shaped fields so prefill keeps working on back-navigation.
      setData({
        legalName: values.legalName,
        email: values.email,
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
    <main className=" mx-auto grid max-w-[1200px]  grid-cols-1 items-start gap-10 px-4 py-3 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:py-4">
      {/* Left: editorial context */}
      <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-8">
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
        <Card padding="lg" className="flex flex-col gap-3 !p-6 sm:!p-7 lg:gap-4 lg:!p-7">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Company Registration</h2>
          </div>
          {/* <StepProgress stepKey="details" /> */}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <Input
              id="legalName"
              type="text"
              label="LEGAL COMPANY NAME"
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
              label="OFFICIAL EMAIL ADDRESS"
              required
              placeholder="admin@company.com"
              error={errors.email?.message}
              adornment={<Icon name="mail" size={20} />}
              {...field("email", {
                required: "Email is required.",
                pattern: { value: EMAIL_REGEX, message: "Enter a valid email address." },
              })}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                label="ACCOUNT PASSWORD"
                required
                placeholder="••••••••••••"
                error={errors.password?.message}
                adornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-on-surface-variant transition-colors hover:text-primary"
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
                id="contact"
                type="tel"
                label="CONTACT NUMBER"
                required
                placeholder="9632585698"
                error={errors.contact?.message}
                adornment={<Icon name="smartphone" size={20} />}
                {...field("contact", {
                  required: "Contact number is required.",
                  pattern: { value: PHONE_REGEX, message: "Enter a valid 10-digit mobile number." },
                })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className={LABEL}>
                SELECT YOUR ROLE<span className="align-middle text-base leading-none text-error"> *</span>
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {ROLES.map((r) => (
                  <label
                    key={r.value}
                    className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl px-4 transition-colors ${
                      role === r.value ? "bg-primary-container" : "bg-surface-container-highest hover:bg-surface-variant"
                    }`}
                  >
                    <input
                      type="radio"
                      value={r.value}
                      className="size-4 accent-primary border-outline-variant text-primary focus:ring-primary/20"
                      {...field("role", { required: "Please select a role." })}
                    />
                    <span className="text-sm font-medium text-on-surface">{r.label}</span>
                  </label>
                ))}
              </div>
              <ErrorText msg={errors.role?.message} />
            </div>

            {/* B2B-only: GST + CIN, revealed after role selection */}
            {isB2B && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  id="gstNumber"
                  type="text"
                  label="GST NUMBER"
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
                  label="CIN NUMBER"
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
                className="cta-gradient flex h-12 w-full items-center justify-center gap-2 bg-primary rounded-xl font-headline text-lg font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
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
