"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { EMAIL_REGEX } from "@/lib/validation";

interface ForgotPasswordForm {
  email: string;
}

/**
 * Shared "forgot password" screen for every portal. The `basePath` prop sets the
 * route prefix so the back/return links land on the right sign-in page; it
 * defaults to the normal `/login` portal.
 */
export function ForgotPasswordScreen({ basePath = "/login" }: { basePath?: string }) {
  const [sent, setSent] = useState(false);

  const {
    register: field,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ defaultValues: { email: "" } });

  // TODO: wire to the password-reset service once the endpoint is available.
  const onSubmit = async (_values: ForgotPasswordForm) => {
    setSent(true);
    toast.success("If an account exists for that email, a reset link is on its way.");
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <Card padding="lg" className="flex w-full max-w-[480px] flex-col gap-6 !p-6 sm:!p-8">
        <FocusedHeader backLabel="Back to sign in" backHref={basePath} />

        {sent ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
              <Icon name="mark_email_read" size={28} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Check your inbox</h2>
              <p className="text-sm text-on-surface-variant">
                We&apos;ve sent a password reset link to{" "}
                <span className="font-bold text-on-surface">{getValues("email")}</span>.
              </p>
            </div>
            <Link href={basePath} className="text-sm font-bold text-primary hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="font-headline text-2xl font-bold text-on-surface">Forgot password?</h2>
              <p className="text-sm text-on-surface-variant">
                Enter the email tied to your account and we&apos;ll send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>

              <p className="text-center text-sm text-on-surface-variant">
                Remembered it?{" "}
                <Link href={basePath} className="font-bold text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
