/**
 * Shared validation regexes — the single source of truth for field formats.
 * Import these instead of re-declaring patterns at the top of a page/component.
 * (URL_REGEX intentionally lives in `startup-profile-options.ts` alongside the
 * profile-options it validates.)
 */

/** Basic email shape: something@something.tld */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Indian 10-digit mobile number (starts 6-9). */
export const PHONE_REGEX = /^[6-9]\d{9}$/;

/** Min 8 chars with lowercase, uppercase, number and symbol. */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

/** 15-character GSTIN. */
export const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;

/** 21-character CIN. */
export const CIN_REGEX = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

/** PAN card number, e.g. ABCDE1234F. */
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/** Aadhaar number: 12 digits. */
export const AADHAAR_REGEX = /^[0-9]{12}$/;

/** Number of digits in an OTP code. */
export const OTP_LENGTH = 4;

/** OTP delivery channel — same enum the OTP payloads use. */
export type OtpChannel = "EMAIL" | "PHONE";
