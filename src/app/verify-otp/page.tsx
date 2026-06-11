"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { ResendControl } from "@/app/verify-account/page";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { verifyMfaOtp, selectMfaChannel } from "@/services/auth.service";
import { maskPhone, maskEmail } from "@/lib/mask";
import { OTP_LENGTH, type OtpChannel } from "@/lib/validation";
import type { ApiError } from "@/lib/axios";

// Where to land once the OTP is verified (session already authenticated).
const SUCCESS_ROUTE = "/home";

export default function VerifyOtpPage() {
  const router = useRouter();
  const { data } = useOnboarding();

  // Which channel the user picked on the previous screen.
  const channel = (data.mfaChannel as OtpChannel) ?? "PHONE";
  const phone = String(data.contact ?? "");
  const email = String(data.email ?? "");

  const isPhone = channel === "PHONE";
  const maskedTarget = isPhone ? maskPhone(phone) : maskEmail(email);

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const verify = async (code: string) => {
    setError(null);
    setVerifying(true);
    try {
      const res = await verifyMfaOtp({ channel, otp: code });
      setMessage(res.message ?? null);
      setVerified(true);
    } catch (err) {
      setError((err as ApiError).message ?? "Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify once all digits are entered (no Verify button), same as registration.
  const handleChange = (next: string[]) => {
    setOtp(next);
    if (verified || verifying) return;
    if (next.join("").length === OTP_LENGTH) verify(next.join(""));
  };

  // Resend re-triggers the OTP for the same channel via the MFA endpoint.
  const handleResend = async () => {
    try {
      const res = await selectMfaChannel({ channel });
      toast.success(res.message ?? "Verification code resent.");
      setOtp(Array(OTP_LENGTH).fill(""));
      setError(null);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't resend OTP. Please try again.");
      // Re-throw so ResendControl keeps the button active (cooldown not reset).
      throw err;
    }
  };

  const handleContinue = () => {
    if (!verified) {
      toast.error("Please verify the OTP to continue.");
      return;
    }
    router.push(SUCCESS_ROUTE);
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <Card padding="lg" className="flex w-full max-w-[480px] flex-col gap-6 !p-6 sm:!p-8">
        <FocusedHeader backLabel="Back" backHref="/select-channel" />

        <div className="text-center">
          <h1 className="mb-3 font-headline text-2xl font-extrabold leading-tight tracking-[-0.02em] text-on-surface md:text-[28px]">
            Verify your {isPhone ? "mobile" : "email"}
          </h1>
          <p className="mx-auto max-w-sm text-base leading-relaxed text-on-surface-variant">
            We&apos;ve sent a {OTP_LENGTH}-digit code to your {isPhone ? "mobile phone" : "email"}{" "}
            {maskedTarget}.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div className="flex w-[240px] flex-col gap-3 md:w-[304px]">
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 font-label text-sm font-semibold text-on-surface-variant">
                <Icon name={isPhone ? "smartphone" : "mail"} size={16} />
                {isPhone ? "Mobile OTP" : "Email OTP"}
              </label>

              {!verified && <ResendControl onResend={handleResend} />}
            </div>

            <OtpInput value={otp} onChange={handleChange} />

            {verified ? (
              <span className="flex items-center gap-1 px-1 text-xs font-medium text-primary">
                <Icon name="check_circle" size={16} />
                {message ?? "OTP Verified"}
              </span>
            ) : verifying ? (
              <span className="px-1 text-xs font-medium text-on-surface-variant">Verifying…</span>
            ) : error ? (
              <span className="px-1 text-xs font-medium text-error">{error}</span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!verified}
          className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:transform-none disabled:cursor-default disabled:opacity-60"
        >
          Verify and Continue
        </button>
      </Card>
    </main>
  );
}
