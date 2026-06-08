/** Payload sent when registering a company (step 1). Field names/values match the backend schema. */
export interface RegisterPayload {
  companyName: string;
  email: string;
  // countryCode currently not sent — kept optional so it can be re-enabled later.
  countryCode?: string;
  phoneNumber: string;
  password: string;
  role: "INVESTOR" | "B2B" | "STARTUP";
  termsAccepted: boolean;
  gstNumber?: string;
  cinNumber?: string;
}

/** Response from the register endpoint. Tokens are issued here now (OTP is sent in parallel). */
export interface RegisterResponse {
  success?: boolean;
  message?: string;
  data?: { accessToken: string; refreshToken: string };
}

/** Payload for verifying a one-time code. Field names/values match the backend schema. */
export interface VerifyOtpPayload {
  /** Which channel the code was sent over. */
  channel: "EMAIL" | "MOBILE";
  otp: string;
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is MOBILE. */
  phoneNumber?: string;
}

/** Payload for requesting a fresh OTP. Field names/values match the backend schema. */
export interface ResendOtpPayload {
  /** Which channel to resend the code over. */
  channel: "EMAIL" | "MOBILE";
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is MOBILE. */
  phoneNumber?: string;
}

/** Response from the resend-otp endpoint. */
export interface ResendOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}

/** Response from an OTP verify endpoint. Tokens are now issued at registration, not here. */
export interface VerifyOtpResponse {
  success?: boolean;
  message?: string;
  data?: {
    /** True once both channels are verified and registration completed. */
    isCompleted?: boolean;
  };
}
