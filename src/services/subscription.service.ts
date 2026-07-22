import { api } from "@/lib/axios";
import { API_ENDPOINTS } from "@/config/constant";
import type {
  SubscriptionPlan,
  SubscriptionPlansResponse,
  SelectPlanPayload,
  SelectPlanResponse,
  UserSubscriptionData,
  UserSubscriptionResponse,
} from "@/types/api.types";

/**
 * Fetch all active subscription plans.
 * GET /api/v1/subscriptions/plans
 *
 * Each plan includes a server-calculated valid_till_preview date
 * (today + validity_days) so the UI renders it directly without client-side math.
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<SubscriptionPlansResponse>(
    API_ENDPOINTS.SUBSCRIPTION_PLANS
  );
  return data.data ?? [];
}

/**
 * Select a plan for the authenticated user.
 * POST /api/v1/subscriptions/select  —  body: { plan_id }
 *
 * Any existing active subscription is cancelled on the server before the
 * new one is created. Response includes start_date and end_date.
 */
export async function selectSubscriptionPlan(
  payload: SelectPlanPayload
): Promise<SelectPlanResponse> {
  const { data } = await api.post<SelectPlanResponse>(
    API_ENDPOINTS.SUBSCRIPTION_SELECT,
    payload
  );
  return data;
}

/**
 * Fetch the authenticated user's currently active subscription.
 * GET /api/v1/subscriptions/my
 *
 * Returns null when the user has no active subscription (server returns 404
 * which the axios interceptor throws as an ApiError; caught here so the UI
 * can treat "no plan yet" as a normal state rather than an error).
 */
export async function getUserSubscription(): Promise<UserSubscriptionData | null> {
  try {
    const { data } = await api.get<UserSubscriptionResponse>(
      API_ENDPOINTS.SUBSCRIPTION_MY
    );
    return data.data ?? null;
  } catch {
    return null;
  }
}