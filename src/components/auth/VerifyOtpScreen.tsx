"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { OtpInput } from "@/components/onboarding/OtpInput";
import { ResendControl } from "@/app/registration/verify-account/page";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { verifyMfaOtp, selectMfaChannel, type Portal } from "@/services/auth.service";
import { OTP_LENGTH, type OtpChannel } from "@/lib/validation";
import { normalizeRole } from "@/lib/roles";
import { getSession, setSession } from "@/lib/auth-session";
import type { ApiError } from "@/lib/axios";

// Fallback landing route if the verify response doesn't supply a redirectRoute.
const SUCCESS_ROUTE = "/dashboard";

/**
 * Shared MFA OTP-entry screen for every portal. Props select the route prefix and
 * backend endpoint; defaults serve the normal `/login` portal. The post-
 * verification landing route is decided by the backend (`redirectRoute`), with a
 * dashboard fallback — so each portal lands wherever its backend says.
 */
export function VerifyOtpScreen({
  basePath = "/login",
  portal = "user",
}: {
  basePath?: string;
  portal?: Portal;
}) {
  const router = useRouter();
  const { data } = useOnboarding();

  // Which channel the user picked on the previous screen.
  const channel = (data.mfaChannel as OtpChannel) ?? "PHONE";
  // Both values arrive already masked from the login API; show them as-is.
  const maskedMobile = String(data.maskedMobile ?? "");
  const maskedEmail = String(data.maskedEmail ?? "");

  const isPhone = channel === "PHONE";
  const maskedTarget = isPhone ? maskedMobile : maskedEmail;

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Route the backend hands back on successful verification (falls back below).
  const [redirectRoute, setRedirectRoute] = useState<string | null>(null);

  const verify = async (code: string) => {
    setError(null);
    setVerifying(true);
    try {
      const res = await verifyMfaOtp({ channel, otp: code }, portal);
      console.log("redirectRoute123", res.data?.redirectRoute);
      const destination = res.data?.redirectRoute || SUCCESS_ROUTE;
      setMessage(res.message ?? null);
      setRedirectRoute(destination);
      // Persist the real name + role echoed back here so the dashboard sidebar shows
      // the actual signed-in user (login only had the email at that point). The
      // dashboard's AuthProvider reads this from localStorage on mount.
      const current = getSession();
      console.log("current123", current)
      const fullName = [res.data?.first_name, res.data?.last_name].filter(Boolean).join(" ").trim();
      const nextRole = normalizeRole(res.data?.role) ?? current?.role ?? null;
      if (nextRole) {
        setSession({ role: nextRole, user: { ...current?.user, name: fullName || current?.user?.name } });
      }
      setVerified(true);
      router.push(destination);
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
      const res = await selectMfaChannel({ channel }, portal);
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
    // Honor the backend's redirectRoute; fall back to the dashboard.
    router.push(redirectRoute || SUCCESS_ROUTE);
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <Card padding="lg" className="flex w-full max-w-[480px] flex-col gap-6 !p-6 sm:!p-8">
        <FocusedHeader backLabel="Back" backHref={`${basePath}/select-channel`} />

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
          className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          Verify and Continue
        </button>
      </Card>
    </main>
  );
}
