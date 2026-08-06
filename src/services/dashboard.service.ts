import { api } from '@/lib/axios'; // Adjust path based on your project
import { API_ENDPOINTS } from '@/config/constant';

/**
 * Fetch user role-specific dashboard data
 * Returns profile summary + stat counters (connections, deal rooms, documents, etc)
 * Roles: STARTUP, INVESTOR, B2B
 * 
 * @returns {Promise} Response with profile and stats
 * @throws {Error} If API call fails
 * 
 * Example response:
 * {
 *   success: true,
 *   message: "Dashboard data fetched successfully",
 *   data: {
 *     profile: { firstName, lastName, organizationName, role, isActive, kycStatus },
 *     stats: { connectionsSent, connectionsReceived, connectionsAccepted, activeDealRooms, ... }
 *   }
 * }
 */
export async function fetchUserDashboard() {
  try {
    const response = await api.get(API_ENDPOINTS.USER_DASHBOARD);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user dashboard:', error);
    throw error;
  }
}

/**
 * Fetch admin dashboard KPIs
 * Returns admin profile + user counts, KYC pipeline, recent activity
 * Role: ADMIN
 * 
 * @returns {Promise} Response with admin profile and stats
 * @throws {Error} If API call fails
 * 
 * Example response:
 * {
 *   success: true,
 *   message: "Dashboard data fetched successfully",
 *   data: {
 *     adminProfile: { name, role },
 *     stats: { totalUsers, suspendedUsers, newRegistrationsLast7Days, kycPending, kycApproved, kycRejected }
 *   }
 * }
 */
export async function fetchAdminDashboard() {
  try {
    const response = await api.get(API_ENDPOINTS.ADMIN_DASHBOARD);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch admin dashboard:', error);
    throw error;
  }
}

/**
 * Fetch super admin platform-wide KPIs
 * Returns super admin profile + total users, orgs, KYC stats, active today, admin health
 * Role: SUPER_ADMIN
 * 
 * @returns {Promise} Response with admin profile and extended stats
 * @throws {Error} If API call fails
 * 
 * Example response:
 * {
 *   success: true,
 *   message: "Dashboard data fetched successfully",
 *   data: {
 *     adminProfile: { name, role },
 *     stats: {
 *       totalUsers, totalOrganizations, kycPending, activeToday,
 *       kycApproved, kycRejected, suspendedUsers, newRegistrationsLast7Days,
 *       totalAdmins, activeAdmins, suspendedAdmins
 *     }
 *   }
 * }
 */
export async function fetchSuperAdminDashboard() {
  try {
    const response = await api.get(API_ENDPOINTS.SUPER_ADMIN_DASHBOARD);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch super admin dashboard:', error);
    throw error;
  }
}
