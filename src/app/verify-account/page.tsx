"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { toast } from "sonner";
import { verifyMobileOtp, verifyEmailOtp, resendOtp } from "@/services/auth.service";
import type { ApiError } from "@/lib/axios";

const OTP_LENGTH = 4;

const RESEND_SECONDS = 60;

/** react-hook-form shape: one digit array per OTP channel. */
interface VerifyForm {
  mobileOtp: string[];
  emailOtp: string[];
}

/** Mask a phone number, keeping only the last 4 digits visible. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "(+91 ••• ••• 4492)";
  return `••• ••• ${digits.slice(-4)}`;
}

/** Mask an email: first char + dots for the hidden middle + last 4 chars, domain shown. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "(j•••@company.com)";
  if (local.length <= 5) return `${local}@${domain}`;
  const hidden = local.length - 5; // 1 first char + 4 last chars revealed
  return `${local[0]}${".".repeat(hidden)}${local.slice(-4)}@${domain}`;
}

/**
 * Self-contained resend control: starts a 60s countdown on mount, shows the
 * timer while active, swaps to a Resend button at 0, and restarts on resend.
 * Each instance owns its timer, so mobile/email are independent. Occupies a
 * fixed-width slot so the timer→button swap doesn't shift layout.
 */
function ResendControl({ onResend }: { onResend: () => Promise<void> }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleResend = async () => {
    if (sending) return;
    setSending(true);
    try {
      await onResend();
      // Only restart the cooldown when the resend actually succeeded.
      setSeconds(RESEND_SECONDS);
    } catch {
      // Leave the button active so the user can retry.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-w-[10px] items-center justify-center font-label text-sm font-semibold text-on-surface-variant">
      {seconds > 0 ? (
        <span>
         <span className="font-bold text-on-surface">0:{String(seconds).padStart(2, "0")}</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={sending}
          className="rounded-full  px-3 py-1 font-bold text-primary transition-colors hover:bg-surface-container disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend"}
        </button>
      )}
    </div>
  );
}

export default function VerifyAccountPage() {
  const { data, goNext } = useOnboarding();

  const { control, setValue } = useForm<VerifyForm>({
    defaultValues: {
      mobileOtp: Array(OTP_LENGTH).fill(""),
      emailOtp: Array(OTP_LENGTH).fill(""),
    },
  });

  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [mobileMsg, setMobileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);

  const bothVerified = mobileVerified && emailVerified;

  // Both channels verified → user clicks Continue to advance to complete-profile.
  const handleContinue = () => {
    if (!bothVerified) {
      toast.error("Please verify both your mobile and email OTP to continue.");
      return;
    }
    goNext("verification");
  };

  const verifyMobile = async (otp: string) => {
    setMobileError(null);
    setVerifyingMobile(true);
    try {
      const res = await verifyMobileOtp({ channel: "PHONE", phoneNumber: String(data.contact ?? ""), otp });
      setMobileMsg(res.message ?? null);
      setMobileVerified(true);
    } catch (err) {
      setMobileError((err as ApiError).message ?? "Verification failed. Please try again.");
    } finally {
      setVerifyingMobile(false);
      setValue("mobileOtp", Array(OTP_LENGTH).fill(""));
    }
  };

  const verifyEmail = async (otp: string) => {
    setEmailError(null);
    setVerifyingEmail(true);
    try {
      const res = await verifyEmailOtp({ channel: "EMAIL", email: String(data.email ?? ""), otp });
      setEmailMsg(res.message ?? null);
      setEmailVerified(true);
    } catch (err) {
      setEmailError((err as ApiError).message ?? "Verification failed. Please try again.");
    } finally {
      setVerifyingEmail(false);
      setValue("emailOtp", Array(OTP_LENGTH).fill(""));
    }
  };

  // Auto-trigger verification once all digits are entered (no Verify button).
  // `onChange` is RHF's field updater from the Controller.
  const handleMobileChange = (next: string[], onChange: (v: string[]) => void) => {
    onChange(next);
    if (mobileVerified || verifyingMobile) return;
    if (next.join("").length === OTP_LENGTH) verifyMobile(next.join(""));
  };

  const handleEmailChange = (next: string[], onChange: (v: string[]) => void) => {
    onChange(next);
    if (emailVerified || verifyingEmail) return;
    if (next.join("").length === OTP_LENGTH) verifyEmail(next.join(""));
  };

  const handleResendMobileOtp = async () => {
    try {
      const res = await resendOtp({ channel: "PHONE", phoneNumber: String(data.contact ?? "") });
      toast.success(res.message ?? "OTP resent to your mobile.");
      setValue("mobileOtp", Array(OTP_LENGTH).fill(""));
      setMobileError(null);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't resend OTP. Please try again.");
      // Re-throw so ResendControl keeps the button active (cooldown not reset).
      throw err;
    }
  };

  const handleResendEmailOtp = async () => {
    try {
      const res = await resendOtp({ channel: "EMAIL", email: String(data.email ?? "") });
      toast.success(res.message ?? "OTP resent to your email.");
      setValue("emailOtp", Array(OTP_LENGTH).fill(""));
      setEmailError(null);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't resend OTP. Please try again.");
      // Re-throw so ResendControl keeps the button active (cooldown not reset).
      throw err;
    }
  };

  return (
    // <div className="mx-auto flex w-full max-w-[560px] flex-col px-6 py-8">
      <div className="mx-auto my-6 w-full max-w-[560px] rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-3 !p-6 sm:!p-8 lg:gap-6 lg:!p-8">
      <FocusedHeader backHref="/register" />

      <div className="mb-3 text-center">
        <h1 className="mb-3 font-headline text-2xl font-extrabold leading-tight tracking-[-0.02em] text-on-surface md:text-[28px]">
          Secure your account
        </h1>
        <p className="mx-auto max-w-sm text-base leading-relaxed text-on-surface-variant">
          We&apos;ve sent a 4-digit code to your mobile phone ({maskPhone(String(data.contact ?? ""))})
          {" "}and email ({maskEmail(String(data.email ?? ""))}).
        </p>
      </div>

      <div className="space-y-6">
        {/* <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="smartphone" size={16} /> Mobile OTP
          </label>
          <OtpInput value={mobileOtp} onChange={setMobileOtp} />
        </div> */}

        <div className="flex flex-col items-center gap-4">
          <div className="flex w-[240px] flex-col gap-3 md:w-[304px]">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
                <Icon name="smartphone" size={16} />
                Mobile OTP
              </label>

              {!mobileVerified && <ResendControl onResend={handleResendMobileOtp} />}
            </div>

            <Controller
              control={control}
              name="mobileOtp"
              render={({ field }) => (
                <OtpInput
                  value={field.value}
                  onChange={(next) => handleMobileChange(next, field.onChange)}
                />
              )}
            />

            {mobileVerified ? (
              <span className="flex items-center gap-1 px-1 text-xs font-medium text-primary">
                <Icon name="check_circle" size={16} />{mobileMsg ?? "Mobile Otp Verified"}
              </span>
            ) : verifyingMobile ? (
              <span className="px-1 text-xs font-medium text-on-surface-variant">Verifying…</span>
            ) : mobileError ? (
              <span className="px-1 text-xs font-medium text-error">{mobileError}</span>
            ) : null}
          </div>
        </div>


        {/* <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="mail" size={16} /> Email OTP
          </label>
          <OtpInput value={emailOtp} onChange={setEmailOtp} />
        </div> */}

        <div className="flex flex-col items-center gap-4">
          <div className="flex w-[240px] flex-col gap-3 md:w-[304px]">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
                <Icon name="mail" size={16} />
                Email OTP
              </label>

              {!emailVerified && <ResendControl onResend={handleResendEmailOtp} />}
            </div>

            <Controller
              control={control}
              name="emailOtp"
              render={({ field }) => (
                <OtpInput
                  value={field.value}
                  onChange={(next) => handleEmailChange(next, field.onChange)}
                />
              )}
            />

            {emailVerified ? (
              <span className="flex items-center gap-1 px-1 text-xs font-medium text-primary">
                <Icon name="check_circle" size={16} />{emailMsg ?? "Email Otp Verified"}
              </span>
            ) : verifyingEmail ? (
              <span className="px-1 text-xs font-medium text-on-surface-variant">Verifying…</span>
            ) : emailError ? (
              <span className="px-1 text-xs font-medium text-error">{emailError}</span>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!bothVerified}
        className="cta-gradient flex h-12 w-full items-center justify-center gap-2 bg-primary rounded-xl font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue
      </button>
    </div>
  );
}
