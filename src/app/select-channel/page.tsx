"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { FocusedHeader } from "@/components/onboarding/FocusedHeader";
import { useOnboarding } from "@/components/onboarding/OnboardingProvider";
import { selectMfaChannel } from "@/services/auth.service";
import { maskPhone, maskEmail } from "@/lib/mask";
import { type OtpChannel } from "@/lib/validation";
import type { ApiError } from "@/lib/axios";

// After the channel is chosen + OTP triggered, the user enters the code here.
const OTP_ENTRY_ROUTE = "/verify-otp";

interface ChannelOptionProps {
  icon: string;
  title: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
}

/** One selectable verification channel row (mobile / email). */
function ChannelOption({ icon, title, value, selected, onSelect }: ChannelOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary-container/40 ring-2 ring-primary/15"
          : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
      }`}
    >
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${
          selected ? "bg-primary text-on-primary" : "bg-surface-container-highest text-primary"
        }`}
      >
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-on-surface">{title}</p>
        <p className="truncate text-sm text-on-surface-variant">{value}</p>
      </div>
      <Icon
        name={selected ? "check_circle" : "radio_button_unchecked"}
        size={22}
        className={selected ? "text-primary" : "text-outline-variant"}
      />
    </button>
  );
}

export default function SelectChannelPage() {
  const router = useRouter();
  const { data, setData } = useOnboarding();
  const [channel, setChannel] = useState<OtpChannel>("PHONE");
  const [sending, setSending] = useState(false);

  const phone = String(data.contact ?? "");
  const email = String(data.email ?? "");

  const handleContinue = async () => {
    if (sending) return;
    setSending(true);
    try {
      // Send only the chosen channel; the backend triggers the OTP send.
      const res = await selectMfaChannel({ channel });
      // Persist the chosen channel so the verify-otp page knows which one to show.
      setData({ mfaChannel: channel });
      toast.success(res.message ?? "Verification code sent.");
      router.push(OTP_ENTRY_ROUTE);
    } catch (err) {
      toast.error((err as ApiError).message ?? "Couldn't send the code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-80px)] items-center justify-center px-4 py-8">
      <Card padding="lg" className="flex w-full max-w-[480px] flex-col gap-5 !p-6 sm:!p-8">
        <FocusedHeader backLabel="Back to Login" backHref="/login" />

        <div>
          <h1 className="font-headline text-2xl font-extrabold tracking-[-0.02em] text-on-surface md:text-[28px]">
            Choose Verification Method
          </h1>
          <p className="mt-2 text-base leading-relaxed text-on-surface-variant">
            Select how you would like to receive your one-time verification code.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <ChannelOption
            icon="smartphone"
            title="Send OTP to Mobile"
            value={maskPhone(phone)}
            selected={channel === "PHONE"}
            onSelect={() => setChannel("PHONE")}
          />
          <ChannelOption
            icon="mail"
            title="Send OTP to Email"
            value={maskEmail(email)}
            selected={channel === "EMAIL"}
            onSelect={() => setChannel("EMAIL")}
          />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={sending}
          className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending…" : "Continue"}
          {!sending && <Icon name="arrow_forward" size={20} />}
        </button>
      </Card>
    </main>
  );
}
