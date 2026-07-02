"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpVerifyCard } from "@/components/auth/OtpVerifyCard";
import { SessionChooserModal } from "@/components/auth/SessionChooserModal";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { verifyMfaOtp, selectMfaChannel, type Portal } from "@/services/auth.service";
import { getSessionLimitStatus } from "@/services/session.service";
import { OTP_LENGTH, type OtpChannel } from "@/lib/validation";
import { normalizeRole } from "@/lib/roles";
import { getSession, setSession } from "@/lib/auth-session";
import { ERROR_MESSAGES } from "@/lib/messages";
import type { ActiveSession } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

// Fallback landing route if the verify response doesn't supply a redirectRoute.
const SUCCESS_ROUTE = "/dashboard";

/**
 * Shared MFA OTP-entry screen for every portal. Props select the route prefix and
 * backend endpoint; defaults serve the normal `/login` portal. The post-
 * verification landing route is decided by the backend (`redirectRoute`), with a
 * dashboard fallback — so each portal lands wherever its backend says. The OTP
 * card markup is shared with the reset flow via `OtpVerifyCard`.
 *
 * After OTP verification the screen checks the active-session limit
 * (GET /api/v1/sessions/limit-status) before redirecting:
 *   • atLimit: false → redirect to dashboard as normal.
 *   • atLimit: true  → open the SessionChooserModal so the user can revoke an
 *                       existing device, then proceed to the dashboard.
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

  // Session-limit check state — populated after OTP verification succeeds.
  const [redirectRoute, setRedirectRoute] = useState<string | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  const handleVerify = async (code: string) => {
    const res = await verifyMfaOtp({ channel, otp: code }, portal);
    const destination = res.data?.redirectRoute || SUCCESS_ROUTE;
    setRedirectRoute(destination);
    // Persist the real name + role echoed back here so the dashboard sidebar shows
    // the actual signed-in user (login only had the email at that point). The
    // dashboard's AuthProvider reads this from localStorage on mount.
    const current = getSession();
    const fullName = [res.data?.first_name, res.data?.last_name].filter(Boolean).join(" ").trim();
    const nextRole = normalizeRole(res.data?.role) ?? current?.role ?? null;
    if (nextRole) {
      setSession({ role: nextRole, user: { ...current?.user, name: fullName || current?.user?.name } });
    }
    // Check the active-session limit before redirecting. If at the limit, open
    // the chooser modal instead. Falls back to normal redirect on check failure
    // so OTP verification is never blocked by a secondary service outage.
    try {
      const limitRes = await getSessionLimitStatus();
      if (limitRes.data?.atLimit) {
        setActiveSessions(limitRes.data.activeSessions ?? []);
        setSessionModalOpen(true);
      } else {
        router.push(destination);
      }
    } catch (err) {
      toast.error((err as ApiError).message ?? ERROR_MESSAGES.SESSION_LIMIT_FETCH_FAILED);
      router.push(destination);
    }
    return { message: res.message ?? undefined };
  };

  // Resend re-triggers the OTP for the same channel via the MFA endpoint.
  const handleResend = async () => {
    try {
      const res = await selectMfaChannel({ channel }, portal);
      toast.success(res.message ?? "Verification code resent.");
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't resend OTP. Please try again.");
      // Re-throw so ResendControl keeps the button active (cooldown not reset).
      throw err;
    }
  };

  // Modal cancel — user abandons login; send them back to the login page.
  const handleModalCancel = () => {
    setSessionModalOpen(false);
    router.push(basePath);
  };

  // Modal success — sessions revoked; proceed to the dashboard as normal.
  const handleModalSuccess = () => {
    setSessionModalOpen(false);
    router.push(redirectRoute || SUCCESS_ROUTE);
  };

  return (
    <>
      <OtpVerifyCard
        title={`Verify your ${isPhone ? "mobile" : "email"}`}
        subtitle={
          <>
            We&apos;ve sent a {OTP_LENGTH}-digit code to your{" "}
            {isPhone ? "mobile phone" : "email"} {maskedTarget}.
          </>
        }
        backHref={`${basePath}/select-channel`}
        channelIcon={isPhone ? "smartphone" : "mail"}
        channelLabel={isPhone ? "Mobile OTP" : "Email OTP"}
        onVerify={handleVerify}
        onResend={handleResend}
      />

      {/* Rendered outside OtpVerifyCard so it portal-mounts cleanly to document.body */}
      <SessionChooserModal
        open={sessionModalOpen}
        sessions={activeSessions}
        onCancel={handleModalCancel}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
