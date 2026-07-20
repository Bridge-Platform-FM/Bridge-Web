import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  AdminFaqItem,
  AdminFaqListResponse,
  CreateFaqPayload,
  UpdateFaqPayload,
  FaqActionResponse,
} from "@/types/api.types";

/**
 * Admin FAQ management service.
 * All functions require an admin JWT — attached automatically by the axios interceptor.
 */

/** Fetch all FAQs (including inactive) for the admin management table. */
export async function fetchAllFaqsForAdmin(): Promise<AdminFaqItem[]> {
  const { data } = await api.get<AdminFaqListResponse>(API_ENDPOINTS.ADMIN_FAQS);
  return (data?.data ?? []) as AdminFaqItem[];
}

/** Create a new FAQ entry. */
export async function createFaq(payload: CreateFaqPayload): Promise<FaqActionResponse> {
  const { data } = await api.post<FaqActionResponse>(API_ENDPOINTS.ADMIN_FAQ_CREATE, payload);
  return data;
}

/** Update an existing FAQ entry by id. */
export async function updateFaq(id: number, payload: UpdateFaqPayload): Promise<FaqActionResponse> {
  const { data } = await api.put<FaqActionResponse>(API_ENDPOINTS.ADMIN_FAQ_UPDATE(String(id)), payload);
  return data;
}