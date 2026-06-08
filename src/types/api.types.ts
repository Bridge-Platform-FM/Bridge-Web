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
  channel: "EMAIL" | "PHONE";
  otp: string;
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is PHONE. */
  phoneNumber?: string;
}

/** Payload for requesting a fresh OTP. Field names/values match the backend schema. */
export interface ResendOtpPayload {
  /** Which channel to resend the code over. */
  channel: "EMAIL" | "PHONE";
  /** Required when channel is EMAIL. */
  email?: string;
  /** Required when channel is PHONE. */
  phoneNumber?: string;
}

/** Response from the resend-otp endpoint. data is an empty array on success. */
export interface ResendOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown[];
}

/** Response from an OTP verify endpoint. Tokens are issued at registration, not here; data is an empty array on success. */
export interface VerifyOtpResponse {
  success?: boolean;
  message?: string;
  data?: unknown[];
}

/** Result of a virus scan + S3 upload (`/file/scan-img` | `/file/scan-document`). */
export interface ScanResult {
  /** S3 object key of the stored file; sent back to the backend with the submit payload. */
  s3Key: string;
}

/**
 * Complete-profile payload — keys match the backend `user` table columns exactly
 * (snake_case, flat). All optional: only the fields relevant to the user's role are
 * sent. NOTE: some keys intentionally mirror backend spelling quirks
 * (`prefrerred_investment_stage`, `export_rediness`, `products_ervice_Offered`).
 */
export interface UserProfilePayload {
  // basic
  first_name?: string;
  last_name?: string;
  profile_photo?: string;
  short_bio?: string;
  country?: string;
  continent?: string;
  organization_name?: string;
  mobile_number?: string;
  company_email?: string;
  linkedin_profile_url?: string;
  company_website_url?: string;
  primary_sector?: string[];
  // startup
  startup_industry_sector?: string[];
  funding_stage?: string;
  funding_currency?: string;
  funding_ask_amt_min?: number;
  funding_ask_amt_max?: number;
  use_of_funds?: string;
  team_size_min?: number;
  team_size_max?: number;
  incorporation_certificate?: string;
  pitch_deck_certificate?: string;
  business_description?: string;
  startup_intent?: string;
  // investor
  ticket_size_amt_min?: number;
  ticket_size_amt_max?: number;
  prefrerred_investment_stage?: string[];
  investor_sector_preference?: string[];
  geographic_investment_preference?: string[];
  investor_type?: string;
  investor_portfolio_overview?: string;
  number_of_investments_to_date?: number;
  investor_intent?: string;
  // b2b
  b2b_sector?: string;
  b2b_sub_sector?: string;
  industry_vertical?: string;
  revenue_band?: string;
  min_order_quantity?: number;
  export_rediness?: string;
  years_in_operation?: number;
  products_ervice_Offered?: string;
  business_requirements?: string;
  b2b_intent?: string;
}

/** Response from `/users/build-profile`. */
export interface BuildProfileResponse {
  success?: boolean;
  message?: string;
  data?: unknown;
}
