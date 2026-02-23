import { sleep } from "./utils";
import { mockAdminUser } from "./mock-data";
import type {
  AdminUser,
  DashboardData,
  OrderListItem,
  OrderDetail,
  Participant,
  Review,
  ManufacturerOption,
  OrderFilters,
  ParticipantFilters,
  PaginatedResponse,
} from "./types";

// ============================================================================
// API Client Layer — connected to NestJS backend (Neon DB)
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const SIMULATED_DELAY = 400;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  // ==========================================================================
  // AUTH — still mock (backend auth module not yet built)
  // ==========================================================================

  sendOtp: async (phone: string): Promise<{ success: boolean }> => {
    await sleep(SIMULATED_DELAY);
    console.log(`[Mock] OTP sent to ${phone} — use 123456`);
    return { success: true };
  },

  verifyOtp: async (
    phone: string,
    code: string
  ): Promise<{ user: AdminUser; token: string }> => {
    await sleep(SIMULATED_DELAY);
    if (code === "123456") {
      return { user: mockAdminUser, token: "mock-jwt-token-otp-" + phone };
    }
    throw new Error("Invalid OTP");
  },

  loginWithGoogle: async (): Promise<{ user: AdminUser; token: string }> => {
    await sleep(800);
    return { user: mockAdminUser, token: "mock-jwt-token-google-sso" };
  },

  getCurrentUser: async (): Promise<AdminUser> => {
    await sleep(200);
    return mockAdminUser;
  },

  // ==========================================================================
  // DASHBOARD — real API
  // ==========================================================================

  getDashboardSummary: async (): Promise<DashboardData> => {
    return apiFetch<DashboardData>("/api/admin/dashboard");
  },

  // ==========================================================================
  // ORDERS — real API (sample_orders + orders)
  // ==========================================================================

  getOrders: async (
    filters: OrderFilters
  ): Promise<PaginatedResponse<OrderListItem>> => {
    const params = new URLSearchParams();
    if (filters.orderType) params.set("orderType", filters.orderType);
    if (filters.status && filters.status !== "ALL")
      params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    return apiFetch<PaginatedResponse<OrderListItem>>(
      `/api/admin/orders?${params.toString()}`
    );
  },

  getOrderById: async (id: string): Promise<OrderDetail> => {
    return apiFetch<OrderDetail>(`/api/admin/orders/${id}`);
  },

  reassignManufacturer: async (
    orderId: string,
    manufacturerId: string
  ): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>(
      `/api/admin/orders/${orderId}/reassign`,
      {
        method: "PATCH",
        body: JSON.stringify({ manufacturerId }),
      }
    );
  },

  // ==========================================================================
  // PARTICIPANTS — real API
  // ==========================================================================

  getParticipants: async (
    filters: ParticipantFilters
  ): Promise<PaginatedResponse<Participant>> => {
    const params = new URLSearchParams({ type: filters.type });
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    return apiFetch<PaginatedResponse<Participant>>(
      `/api/admin/participants?${params.toString()}`
    );
  },

  toggleParticipant: async (
    participantId: string,
    isActive: boolean,
    type: string = "MANUFACTURER"
  ): Promise<{ success: boolean }> => {
    const action = isActive ? "activate" : "deactivate";
    return apiFetch<{ success: boolean }>(
      `/api/admin/participants/${type}/${participantId}/${action}`,
      { method: "PATCH" }
    );
  },

  // ==========================================================================
  // RATINGS & REVIEWS — real API
  // ==========================================================================

  getReviews: async (): Promise<Review[]> => {
    return apiFetch<Review[]>("/api/admin/reviews");
  },

  deleteReview: async (
    reviewId: string,
    sourceTable?: string
  ): Promise<{ success: boolean }> => {
    const table = sourceTable || "manufacturer_coal_ratings";
    return apiFetch<{ success: boolean }>(
      `/api/admin/reviews/${table}/${reviewId}`,
      { method: "DELETE" }
    );
  },

  // ==========================================================================
  // MANUFACTURER OPTIONS — real API
  // ==========================================================================

  getManufacturerOptions: async (): Promise<ManufacturerOption[]> => {
    return apiFetch<ManufacturerOption[]>(
      "/api/admin/orders/manufacturer-options"
    );
  },

  // ==========================================================================
  // ADMIN USERS — real API
  // ==========================================================================

  getAdminUsers: async (): Promise<AdminUser[]> => {
    return apiFetch<AdminUser[]>("/api/admin/users");
  },

  createAdminUser: async (data: {
    name: string;
    email: string;
    phone?: string;
    role?: string;
  }): Promise<AdminUser> => {
    return apiFetch<AdminUser>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateAdminUser: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
      is_active?: boolean;
    }
  ): Promise<AdminUser> => {
    return apiFetch<AdminUser>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  deleteAdminUser: async (id: string): Promise<{ success: boolean }> => {
    return apiFetch<{ success: boolean }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  },
};
