"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";
import { verifyMobileOtp, verifyEmailOtp } from "@/services/auth.service";
import { setTokens } from "@/lib/auth-tokens";
import type { ApiError } from "@/lib/axios";

const OTP_LENGTH = 4;

const RESEND_SECONDS = 60;

/**
 * Self-contained resend control: starts a 60s countdown on mount, shows the
 * timer while active, swaps to a Resend button at 0, and restarts on resend.
 * Each instance owns its timer, so mobile/email are independent. Occupies a
 * fixed-width slot so the timer→button swap doesn't shift layout.
 */
function ResendControl({ onResend }: { onResend: () => void }) {
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleResend = () => {
    onResend();
    setSeconds(RESEND_SECONDS);
  };

  return (
    <div className="flex min-w-[10px] items-center justify-center text-sm font-medium text-on-surface-variant">
      {seconds > 0 ? (
        <span>
         <span className="font-bold text-on-surface">0:{String(seconds).padStart(2, "0")}</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          className="rounded-full  px-3 py-1 font-bold text-primary transition-colors hover:bg-surface-container"
        >
          Resend
        </button>
      )}
    </div>
  );
}

export default function VerifyAccountPage() {
  const { data, goNext } = useOnboarding();
  const [mobileOtp, setMobileOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));

  const [mobileVerified, setMobileVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingMobile, setVerifyingMobile] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Both channels verified → advance to complete-profile.
  useEffect(() => {
    if (mobileVerified && emailVerified) goNext("verification");
  }, [mobileVerified, emailVerified, goNext]);

  const handleVerifyMobileOtp = async () => {
    const otp = mobileOtp.join("");
    if (otp.length < OTP_LENGTH) {
      setMobileError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    setMobileError(null);
    setVerifyingMobile(true);
    try {
      const res = await verifyMobileOtp({ channel: "MOBILE", phoneNumber: String(data.contact ?? ""), otp });
      // Tokens are only present on the call that verifies the final channel.
      if (res.data?.company) setTokens(res.data.company);
      setMobileVerified(true);
    } catch (err) {
      setMobileError((err as ApiError).message ?? "Verification failed. Please try again.");
    } finally {
      setVerifyingMobile(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    const otp = emailOtp.join("");
    if (otp.length < OTP_LENGTH) {
      setEmailError(`Enter the ${OTP_LENGTH}-digit code.`);
      return;
    }
    setEmailError(null);
    setVerifyingEmail(true);
    try {
      const res = await verifyEmailOtp({ channel: "EMAIL", email: String(data.email ?? ""), otp });
      // Tokens are only present on the call that verifies the final channel.
      if (res.data?.company) setTokens(res.data.company);
      setEmailVerified(true);
    } catch (err) {
      setEmailError((err as ApiError).message ?? "Verification failed. Please try again.");
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleResendMobileOtp = () => {
    // Existing resend handler hook-up point (mobile).
    setMobileOtp(Array(OTP_LENGTH).fill(""));
    setMobileError(null);
  };

  const handleResendEmailOtp = () => {
    // Existing resend handler hook-up point (email).
    setEmailOtp(Array(OTP_LENGTH).fill(""));
    setEmailError(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col px-6 py-8">
      <FocusedHeader backHref="/register" />

      <div className="mb-5 mt-8">
        <StepProgress stepKey="verification" />
      </div>

      <div className="mb-5 text-center">
        <h1 className="mb-4 font-headline text-[32px] font-extrabold leading-tight tracking-[-0.02em] text-on-surface">
          Secure your account
        </h1>
        <p className="mx-auto max-w-sm text-base leading-relaxed text-on-surface-variant">
          We&apos;ve sent a 4-digit code to your mobile phone (+1 ••• ••• 4492) and email (j•••@company.com).
        </p>
      </div>

      <div className="space-y-10">
        {/* <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="smartphone" size={16} /> Mobile OTP
          </label>
          <OtpInput value={mobileOtp} onChange={setMobileOtp} />
        </div> */}

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="smartphone" size={16} />
            Mobile OTP
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <OtpInput value={mobileOtp} onChange={setMobileOtp} />

            {!mobileVerified && <ResendControl onResend={handleResendMobileOtp} />}

            <Button
              variant="primary"
              onClick={handleVerifyMobileOtp}
              disabled={verifyingMobile || mobileVerified}
              className="bg-primary"
            >
              {mobileVerified ? "Verified" : verifyingMobile ? "Verifying…" : "Verify"}
            </Button>
          </div>
          {mobileError && <span className="px-1 text-xs font-medium text-error">{mobileError}</span>}
        </div>


        {/* <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="mail" size={16} /> Email OTP
          </label>
          <OtpInput value={emailOtp} onChange={setEmailOtp} />
        </div> */}

        <div className="flex flex-col gap-4">
          <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
            <Icon name="mail" size={16} />
            Email OTP
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <OtpInput value={emailOtp} onChange={setEmailOtp} />

            {!emailVerified && <ResendControl onResend={handleResendEmailOtp} />}

            <Button
              variant="primary"
              onClick={handleVerifyEmailOtp}
              disabled={verifyingEmail || emailVerified}
              className="bg-primary"
            >
              {emailVerified ? "Verified" : verifyingEmail ? "Verifying…" : "Verify"}
            </Button>
          </div>
          {emailError && <span className="px-1 text-xs font-medium text-error">{emailError}</span>}
        </div>
      </div>

      <div className="mt-7 flex items-center justify-center gap-6 opacity-60">
        <div className="flex items-center gap-2 font-label text-xs font-semibold text-on-surface-variant">
          <Icon name="verified_user" size={16} /> 256-BIT ENCRYPTION
        </div>
        <div className="h-4 w-px bg-outline-variant opacity-20" />
        <div className="flex items-center gap-2 font-label text-xs font-semibold text-on-surface-variant">
          <Icon name="gpp_maybe" size={16} /> SECURE SESSION
        </div>
      </div>

    </div>
  );
}
