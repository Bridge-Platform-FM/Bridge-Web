"use client";

import React, { useRef } from "react";

interface OtpInputProps {
  length?: number;
  value: string[];
  onChange: (next: string[]) => void;
}

/** Row of single-digit OTP boxes matching the Stitch "Secure your account" screen. */
export function OtpInput({ length = 4, value, onChange }: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const setDigit = (i: number, digit: string) => {
    const clean = digit.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[i] = clean;
    onChange(next);
    if (clean && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  return (
    <div className="flex gap-4 md:gap-4">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          placeholder="•"
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="h-14 w-12 rounded-lg border border-outline-variant/30 bg-surface-container-low text-center text-xl font-bold text-on-surface transition-all duration-200 placeholder:text-outline-variant hover:border-outline-variant/60 focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary/10 md:h-16 md:w-14"
        />
      ))}
    </div>
  );
}
