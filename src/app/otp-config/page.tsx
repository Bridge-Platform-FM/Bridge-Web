"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Icon } from "@/components/ui/Icon";
import { toast } from "sonner";
import {
  getOtpConfig,
  createOtpConfig,
  updateOtpConfig,
  deleteOtpConfig,
} from "@/services/otp-config.service";
import type { OtpConfig, OtpConfigPayload } from "@/types/api.types";
import type { ApiError } from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus = "loading" | "fetch-error" | "not-found" | "ready";

interface OtpConfigForm {
  otp_ttl?: number;
  resend_ttl?: number;
  max_attempts?: number;
  block_ttl?: number;
  redis_url: string;
  redis_password: string;
  resend_limit?: number;
}

/** All fields blank — shown when no config exists or after a delete. */
const DEFAULT_VALUES: OtpConfigForm = {
  otp_ttl: undefined,
  resend_ttl: undefined,
  max_attempts: undefined,
  block_ttl: undefined,
  redis_url: "",
  redis_password: "",
  resend_limit: undefined,
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "h-11 w-full rounded-xl border border-outline-variant bg-surface-container px-4 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/40 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed";

const errorCls = "mt-1 px-1 text-xs font-medium text-error";

/** Red asterisk shown next to every required field label. */
const RequiredMark = () => (
  <span className="ml-0.5 text-error" aria-hidden="true">*</span>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OtpConfigPage() {
  const [status, setStatus] = useState<PageStatus>("loading");
  const [existingConfig, setExistingConfig] = useState<OtpConfig | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<OtpConfigForm>({ defaultValues: DEFAULT_VALUES });

  const isCreating = existingConfig === null && status !== "loading";

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchConfig = async () => {
    setStatus("loading");
    setConfirmDelete(false);
    try {
      const result = await getOtpConfig();
      if (result) {
        setExistingConfig(result);
        reset({
          otp_ttl: result.otp_ttl,
          resend_ttl: result.resend_ttl,
          max_attempts: result.max_attempts,
          block_ttl: result.block_ttl,
          redis_url: result.redis_url,
          redis_password: result.redis_password,
          resend_limit: result.resend_limit,
        });
        setStatus("ready");
      } else {
        setExistingConfig(null);
        reset(DEFAULT_VALUES);
        setStatus("not-found");
      }
    } catch {
      setStatus("fetch-error");
    }
  };

  useEffect(() => {
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────

  const onSubmit = async (formData: OtpConfigForm) => {
    setSubmitting(true);
    const payload: OtpConfigPayload = {
      otp_ttl: Number(formData.otp_ttl),
      resend_ttl: Number(formData.resend_ttl),
      max_attempts: Number(formData.max_attempts),
      block_ttl: Number(formData.block_ttl),
      redis_url: formData.redis_url.trim(),
      redis_password: formData.redis_password,
      resend_limit: Number(formData.resend_limit),
    };

    try {
      if (isCreating) {
        const { config: created, message } = await createOtpConfig(payload);
        setExistingConfig(created);
        reset({
          otp_ttl: created.otp_ttl,
          resend_ttl: created.resend_ttl,
          max_attempts: created.max_attempts,
          block_ttl: created.block_ttl,
          redis_url: created.redis_url,
          redis_password: created.redis_password,
          resend_limit: created.resend_limit,
        });
        setStatus("ready");
        toast.success(message);
      } else {
        const { config: updated, message } = await updateOtpConfig(
          existingConfig!.id,
          payload
        );
        setExistingConfig(updated);
        reset({
          otp_ttl: updated.otp_ttl,
          resend_ttl: updated.resend_ttl,
          max_attempts: updated.max_attempts,
          block_ttl: updated.block_ttl,
          redis_url: updated.redis_url,
          redis_password: updated.redis_password,
          resend_limit: updated.resend_limit,
        });
        toast.success(message);
      }
    } catch (err) {
      toast.error(
        (err as ApiError).message ?? "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!existingConfig) return;
    setDeleting(true);
    try {
      const { message } = await deleteOtpConfig(existingConfig.id);
      setExistingConfig(null);
      reset(DEFAULT_VALUES);
      setStatus("not-found");
      setConfirmDelete(false);
      toast.success(message);
    } catch (err) {
      toast.error(
        (err as ApiError).message ?? "Couldn't delete config. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <div className="space-y-2">
            <div className="h-7 w-56 animate-pulse rounded-lg bg-surface-container" />
            <div className="h-4 w-80 animate-pulse rounded bg-surface-container" />
          </div>
          <div className="rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 p-8 space-y-8">
            <div className="grid grid-cols-2 gap-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-28 animate-pulse rounded bg-surface-container" />
                  <div className="h-11 animate-pulse rounded-xl bg-surface-container" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-surface-container" />
              <div className="h-11 animate-pulse rounded-xl bg-surface-container" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-28 animate-pulse rounded bg-surface-container" />
              <div className="h-11 animate-pulse rounded-xl bg-surface-container" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── Fetch error ──────────────────────────────────────────────────────────

  if (status === "fetch-error") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10">
            <Icon name="error" size={28} className="text-error" />
          </div>
          <h2 className="mb-2 font-headline text-xl font-bold text-on-surface">
            Couldn&apos;t load config
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">
            There was a problem fetching the OTP configuration. Check your
            connection and try again.
          </p>
          <button
            type="button"
            onClick={fetchConfig}
            className="cta-gradient flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-headline text-sm font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01]"
          >
            <Icon name="refresh" size={18} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ─── Main page ────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-5">

        {/* Page header */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon name="tune" size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-extrabold leading-tight tracking-[-0.02em] text-on-surface">
              OTP Configuration
            </h1>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              Control how one-time passwords are generated, delivered, and expired.
            </p>
          </div>
        </div>

        {/* No config found banner */}
        {status === "not-found" && (
          <div className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container px-4 py-3">
            <Icon name="info" size={18} className="mt-0.5 shrink-0 text-on-surface-variant" />
            <p className="text-sm font-medium text-on-surface">
              No OTP config found.{" "}
              <span className="font-normal text-on-surface-variant">
                Fill in the fields below and click{" "}
              </span>
              <span className="font-semibold text-primary">Create Config</span>
              <span className="font-normal text-on-surface-variant"> to get started.</span>
            </p>
          </div>
        )}

        {/* Delete confirmation banner */}
        {confirmDelete && (
          <div className="flex flex-col gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-error" />
              <p className="text-sm font-medium text-on-surface">
                This will permanently delete the OTP config.{" "}
                <span className="font-normal text-on-surface-variant">
                  This action cannot be undone.
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-error px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        )}

        {/* Form card */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl bg-surface-container-lowest ambient-shadow border border-white/40 flex flex-col gap-8 p-6 sm:p-8"
          noValidate
        >

          {/* Required field legend */}
          <p className="text-xs text-on-surface-variant">
            Fields marked <span className="font-bold text-error">*</span> are required.
          </p>

          {/* Section: OTP Behavior */}
          <div>
            <div className="mb-5 flex items-center gap-2 border-b border-outline-variant pb-2.5">
              <Icon name="timer" size={15} className="text-on-surface-variant" />
              <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                OTP Behavior
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

              {/* OTP TTL */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  OTP TTL <RequiredMark />
                  <span className="ml-1 font-normal opacity-60">(seconds)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 180"
                  className={inputCls}
                  {...register("otp_ttl", {
                    required: "OTP TTL is required",
                    min: { value: 1, message: "Must be at least 1 second" },
                    valueAsNumber: true,
                  })}
                />
                {errors.otp_ttl && (
                  <p className={errorCls}>{errors.otp_ttl.message}</p>
                )}
              </div>

              {/* Resend TTL */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Resend TTL <RequiredMark />
                  <span className="ml-1 font-normal opacity-60">(seconds)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 60"
                  className={inputCls}
                  {...register("resend_ttl", {
                    required: "Resend TTL is required",
                    min: { value: 1, message: "Must be at least 1 second" },
                    valueAsNumber: true,
                  })}
                />
                {errors.resend_ttl && (
                  <p className={errorCls}>{errors.resend_ttl.message}</p>
                )}
              </div>

              {/* Max Attempts */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Max Attempts <RequiredMark />
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3"
                  className={inputCls}
                  {...register("max_attempts", {
                    required: "Max attempts is required",
                    min: { value: 1, message: "Must be at least 1" },
                    valueAsNumber: true,
                  })}
                />
                {errors.max_attempts && (
                  <p className={errorCls}>{errors.max_attempts.message}</p>
                )}
              </div>

              {/* Resend Limit */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Resend Limit <RequiredMark />
                </label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  className={inputCls}
                  {...register("resend_limit", {
                    required: "Resend limit is required",
                    min: { value: 1, message: "Must be at least 1" },
                    valueAsNumber: true,
                  })}
                />
                {errors.resend_limit && (
                  <p className={errorCls}>{errors.resend_limit.message}</p>
                )}
              </div>

              {/* Block TTL — full width */}
              <div className="sm:col-span-2">
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Block TTL <RequiredMark />
                  <span className="ml-1 font-normal opacity-60">(seconds)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 3600"
                  className={inputCls}
                  {...register("block_ttl", {
                    required: "Block TTL is required",
                    min: { value: 1, message: "Must be at least 1 second" },
                    valueAsNumber: true,
                  })}
                />
                {errors.block_ttl && (
                  <p className={errorCls}>{errors.block_ttl.message}</p>
                )}
              </div>

            </div>
          </div>

          {/* Section: Redis Connection */}
          <div>
            <div className="mb-5 flex items-center gap-2 border-b border-outline-variant pb-2.5">
              <Icon name="storage" size={15} className="text-on-surface-variant" />
              <span className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Redis Connection
              </span>
            </div>

            <div className="space-y-5">

              {/* Redis URL */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Redis URL <RequiredMark />
                </label>
                <input
                  type="text"
                  placeholder="redis://localhost:6381"
                  className={inputCls}
                  {...register("redis_url", {
                    required: "Redis URL is required",
                    pattern: {
                      value: /^rediss?:\/\/.+/,
                      message: "Must start with redis:// or rediss://",
                    },
                  })}
                />
                {errors.redis_url && (
                  <p className={errorCls}>{errors.redis_url.message}</p>
                )}
              </div>

              {/* Redis Password */}
              <div>
                <label className="mb-1.5 flex items-center gap-1 font-label text-sm font-semibold text-on-surface-variant">
                  Redis Password <RequiredMark />
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Redis password"
                    className={`${inputCls} pr-11`}
                    {...register("redis_password", {
                      required: "Redis password is required",
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors hover:text-on-surface"
                  >
                    <Icon
                      name={showPassword ? "visibility_off" : "visibility"}
                      size={18}
                    />
                  </button>
                </div>
                {errors.redis_password && (
                  <p className={errorCls}>{errors.redis_password.message}</p>
                )}
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 border-t border-outline-variant pt-6">

            {/* Delete — only when config exists and confirm banner is not shown */}
            {!isCreating && !confirmDelete && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={submitting || deleting}
                className="flex h-12 items-center gap-2 rounded-xl border border-error/40 px-5 font-headline text-sm font-bold text-error transition-colors hover:bg-error/5 disabled:opacity-60"
              >
                <Icon name="delete" size={16} />
                Delete
              </button>
            )}

            {/* Save / Create */}
            <button
              type="submit"
              disabled={submitting || (!isCreating && !isDirty)}
              className="cta-gradient flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary font-headline text-base font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform hover:scale-[1.01] disabled:cursor-default disabled:opacity-60 disabled:transform-none"
            >
              {submitting ? (
                <>
                  <Icon name="autorenew" size={18} className="animate-spin" />
                  {isCreating ? "Creating…" : "Saving…"}
                </>
              ) : (
                <>
                  <Icon name={isCreating ? "add" : "save"} size={18} />
                  {isCreating ? "Create Config" : "Save Changes"}
                </>
              )}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}
