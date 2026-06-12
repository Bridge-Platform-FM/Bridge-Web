"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { loginUser } from "@/services/auth.service";
import { setTokens } from "@/lib/auth-tokens";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { EMAIL_REGEX } from "@/lib/validation";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "@/lib/messages";
import type { ApiError } from "@/lib/axios";

// After a successful sign-in the user picks how to receive their OTP.
const VERIFY_CHANNEL_ROUTE = "/select-channel";

/** "Built for every stage" — who BRIDGE serves. */
const STAGES = [
  {
    icon: "rocket_launch",
    title: "Startups & Founders",
    body: "Pitch your vision to pre-vetted investors. Share traction, funding ask, and team details — get matched with angels, VCs, and PE firms aligned to your stage.",
  },
  {
    icon: "trending_up",
    title: "Investors & Funds",
    body: "Discover high-potential startups filtered by sector, stage, and ticket size. Review founder profiles, traction metrics, and connect through private deal rooms.",
  },
  {
    icon: "handshake",
    title: "B2B Partnerships",
    body: "Find manufacturers, distributors, exporters, and buyers across 20+ industries. Match by intent, geography, and revenue band to build your supply chain.",
  },
];

/** "How it works" — the four-step flow. */
const STEPS = [
  {
    title: "Choose Your Path",
    body: "Sign up and select your mode — B2B partnerships, Founder seeking investors, or Investor discovering startups.",
  },
  {
    title: "Get Matched Intelligently",
    body: "Our algorithm pairs founders with investors by sector and stage, and matches B2B partners by intent and geography.",
  },
  {
    title: "Connect with Confidence",
    body: "Every profile is verified. Send connection requests, accept pitches, and start conversations — no spam, no noise.",
  },
  {
    title: "Close in Deal Rooms",
    body: "Private deal rooms for negotiations, document sharing, AI-powered suggestions, and scheduling calls.",
  },
];

/** "Why BRIDGE" — quick proof points. */
const WHY = [
  "Verification-first — every profile is vetted before you see it",
  "Three modes tailored to B2B, Founders, and Investors",
  "AI compatibility scoring and smart recommendations",
  "Pan-India network spanning 20+ industries and 35+ countries",
];

/** Small uppercase section heading used down the editorial column. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-label text-xs font-bold uppercase tracking-wider text-primary">
      {children}
    </span>
  );
}

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { setData } = useOnboarding();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginForm) => {
    try {
      const res = await loginUser({ email: values.email, password: values.password });
      if (res.data?.accessToken && res.data?.refreshToken) {
        setTokens(res.data);
      } else {
        throw { message: ERROR_MESSAGES.NO_SESSION } as ApiError;
      }
      // Persist the contact info so the verification-channel screen can mask it
      // (phone comes from the backend; email falls back to what was typed).
      setData({
        email: res.data.email ?? values.email,
        contact: res.data.phoneNumber ?? "",
      });
      toast.success(res.message ?? SUCCESS_MESSAGES.LOGIN);
      router.push(VERIFY_CHANNEL_ROUTE);
    } catch (err) {
      toast.error((err as ApiError).message ?? ERROR_MESSAGES.LOGIN_FAILED);
    }
  };

  return (
    <main className="no-scrollbar mx-auto grid max-w-[1200px] grid-cols-1 gap-10 px-4 py-6 sm:px-6 lg:h-[calc(100vh-80px)] lg:grid-cols-12 lg:gap-12 lg:overflow-y-auto lg:py-0">
      {/* Left: editorial context — scrolls with the page; the card stays pinned. */}
      <div className="flex flex-col gap-8 lg:col-span-7 lg:py-10">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-secondary-container">
            Corporate Portal
          </span>
          <h1 className="font-headline text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-on-surface sm:text-4xl lg:text-[2.75rem]">
            Where businesses, startups &amp; <span className="text-primary">investors connect</span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
            Whether you&apos;re scaling a startup, sourcing investment, or growing your supply
            chain — BRIDGE matches you with verified partners who fit.
          </p>
        </div>

        {/* Built for every stage */}
        <div className="flex flex-col gap-5">
          <SectionLabel>Built for every stage</SectionLabel>
          <div className="flex flex-col gap-5">
            {STAGES.map((s) => (
              <div key={s.title} className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-primary">
                  <Icon name={s.icon} size={22} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">{s.title}</p>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="flex flex-col gap-5 rounded-2xl bg-surface-container p-6 sm:p-8">
          <SectionLabel>How it works</SectionLabel>
          <div className="flex flex-col gap-5">
            {STEPS.map((s, i) => (
              <div key={s.title} className="flex items-start gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-headline text-sm font-bold text-on-primary">
                  {i + 1}
                </div>
                <div>
                  <p className="font-bold text-on-surface">{s.title}</p>
                  <p className="text-sm leading-relaxed text-on-surface-variant">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why BRIDGE */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Why BRIDGE</SectionLabel>
          <ul className="flex flex-col gap-3">
            {WHY.map((w) => (
              <li key={w} className="flex items-start gap-3">
                <Icon name="check_circle" size={20} className="shrink-0 text-primary" />
                <span className="text-sm leading-relaxed text-on-surface-variant">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: form card — pinned (sticky) so only the text scrolls past it. */}
      <div className="lg:sticky lg:top-0 lg:col-span-5 lg:flex lg:h-[calc(100vh-80px)] lg:items-center lg:justify-center lg:self-start">
        <Card padding="lg" className="mx-auto flex w-full max-w-md flex-col gap-4 !p-5 sm:!p-6 lg:!p-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-headline text-2xl font-bold text-on-surface">Sign in to portal</h2>
            <p className="text-sm text-on-surface-variant">Enter your credentials to continue.</p>
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

            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              required
              placeholder="••••••••••••"
              error={errors.password?.message}
              adornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="flex h-full items-center justify-center text-on-surface-variant transition-colors hover:text-primary"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} size={20} />
                </button>
              }
              {...field("password", { required: "Password is required." })}
            />

            <div className="flex justify-end">
              <Link href="#" className="text-sm font-bold text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in…" : "Sign In"}
              </button>
              <p className="text-center text-sm text-on-surface-variant">
                New to the portal?{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </main>
  );
}
