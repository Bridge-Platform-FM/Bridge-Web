/** Payload sent when registering a company (step 1). Password is intentionally excluded. */
export interface RegisterPayload {
  legalName: string;
  email: string;
  contact: string;
  role: string;
  gstNumber?: string;
  cinNumber?: string;
}

/** Response from the register endpoint. Adjust fields once the real API is known. */
export interface RegisterResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** Payload for verifying a one-time code (mobile or email). */
export interface VerifyOtpPayload {
  /** Which channel the code was sent over. */
  channel: "mobile" | "email";
  /** Recipient identifier — phone for mobile, email for email. */
  identifier: string;
  otp: string;
}

/** Response from an OTP verify endpoint. Adjust once the real API is known. */
export interface VerifyOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
