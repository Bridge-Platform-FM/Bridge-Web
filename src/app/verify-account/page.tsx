"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StepProgress } from "@/components/onboarding/StepProgress";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { Button } from "@/components/ui/Button";

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
  const { goNext } = useOnboarding();
  const [mobileOtp, setMobileOtp] = useState<string[]>(Array(6).fill(""));
  const [emailOtp, setEmailOtp] = useState<string[]>(Array(6).fill(""));

  const handleResendMobileOtp = () => {
    // Existing resend handler hook-up point (mobile).
    setMobileOtp(Array(6).fill(""));
  };

  const handleResendEmailOtp = () => {
    // Existing resend handler hook-up point (email).
    setEmailOtp(Array(6).fill(""));
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

            <ResendControl onResend={handleResendMobileOtp} />

            <Button
              variant="primary"
            // onClick={handleVerifyMobileOtp}
              className="bg-primary"
            >
              Verify
            </Button>
          </div>
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

            <ResendControl onResend={handleResendEmailOtp} />

            <Button
              variant="primary"
            // onClick={handleVerifyEmailOtp}
              className="bg-primary"
            >
              Verify
            </Button>
          </div>
        </div>



        {/* <div className="flex flex-col gap-6 pt-6">
          <button
            onClick={() => goNext("verification")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-lg text-on-primary shadow-xl  transition-opacity hover:opacity-95"
          >
            Verify &amp; Continue
            <Icon name="chevron_right" size={20} />
          </button>
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-on-surface-variant">
              Didn&apos;t receive the codes? <span className="font-bold text-on-surface">00:54</span>
            </div>
            <button disabled className="rounded-full px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-surface-container disabled:opacity-40">
              Resend Codes
            </button>
          </div>
        </div> */}
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
