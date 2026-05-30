import axios, { AxiosError } from "axios";

/**
 * Shared axios instance for all API calls.
 * Base URL comes from NEXT_PUBLIC_API_BASE_URL (set in .env.local).
 */
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/** A normalized error shape surfaced to callers/UI. */
export interface ApiError {
  message: string;
  status?: number;
  data?: unknown;
}

// Normalize errors so callers get a predictable shape.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    const normalized: ApiError = {
      message:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong. Please try again.",
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(normalized);
  }
);
