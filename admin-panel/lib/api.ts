import type {
  AdminUser,
  DashboardData,
  DashboardOverview,
  StatusCount,
  RegionDemand,
  ParticipantPerformance,
  OrderListItem,
  OrderDetail,
  Participant,
  ParticipantDetail,
  RatingItem,
  RatingCategory,
  ListRatingsResponse,
  ManufacturerOption,
  OrderFilters,
  RequestFiltersParams,
  ParticipantFilters,
  ParticipantType,
  PaginatedResponse,
  DeactivateParticipantDto,
  ReassignRequestDto,
} from "./types";

// ============================================================================
// API Client Layer — aligned with Railway Backend Contract
// https://e-ent-bazar-backend.up.railway.app/api/docs
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/** Read the stored JWT token (if any). */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ent-bazaar-auth");
}

/** Internal fetch wrapper — automatically attaches JWT Authorization header. */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  // Don't send demo-token to backend — it's a local-only session bypass
  const realToken = token && token !== "demo-token" ? token : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(realToken ? { Authorization: `Bearer ${realToken}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401) {
    const currentToken = getAuthToken();
    if (currentToken === "demo-token") {
      throw new Error(`API ${res.status}: Unauthorized`);
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("ent-bazaar-auth");
      localStorage.removeItem("ent-bazaar-demo-user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

/** Map frontend ParticipantType → Railway API query param value */
function toApiParticipantType(
  type: ParticipantType
): string {
  const map: Record<ParticipantType, string> = {
    MANUFACTURER: "manufacturer",
    TRANSPORT_PROVIDER: "transport_provider",
    COAL_PROVIDER: "coal_provider",
    LABOUR_CONTRACTOR: "labour_contractor",
    ENDCUSTOMER: "endcustomer", // Not in Railway — will be gap
  };
  return map[type] || type.toLowerCase();
}

/** Build URLSearchParams from a filters object, skipping undefined/empty values */
function buildParams(filters: Record<string, unknown> | object): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "" && value !== "ALL") {
      params.set(key, String(value));
    }
  }
  return params;
}

export const api = {
  // ==========================================================================
  // AUTH — Railway: POST /api/admin/auth/*
  // ==========================================================================

  /** POST /api/admin/auth/send-otp  Body: { phone, countryCode } */
  sendOtp: async (
    phone: string,
    countryCode: string = "+91"
  ): Promise<{ success: boolean }> => {
    await apiFetch("/api/admin/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, countryCode }),
    });
    return { success: true };
  },

  /** POST /api/admin/auth/verify-otp  Body: { phone, code, countryCode } */
  verifyOtp: async (
    phone: string,
    code: string,
    countryCode: string = "+91"
  ): Promise<{ user: AdminUser; token: string }> => {
    const data = await apiFetch<Record<string, unknown>>(
      "/api/admin/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({ phone, code, countryCode }),
      }
    );

    const token =
      (data.access_token as string) ||
      (data.token as string) ||
      (data.accessToken as string) ||
      "";

    if (!token) {
      throw new Error("No token received from server");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("ent-bazaar-auth", token);
    }

    const user = await api.getCurrentUser();
    return { user, token };
  },

  /** POST /api/admin/auth/google  Body: { idToken } */
  loginWithGoogle: async (
    idToken: string
  ): Promise<{ user: AdminUser; token: string }> => {
    const data = await apiFetch<Record<string, unknown>>(
      "/api/admin/auth/google",
      {
        method: "POST",
        body: JSON.stringify({ idToken }),
      }
    );

    const token =
      (data.access_token as string) ||
      (data.token as string) ||
      (data.accessToken as string) ||
      "";

    if (!token) {
      throw new Error("No token received from server");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("ent-bazaar-auth", token);
    }

    const user = await api.getCurrentUser();
    return { user, token };
  },

  getCurrentUser: async (): Promise<AdminUser> => {
    return apiFetch<AdminUser>("/api/admin/auth/me");
  },

  // ==========================================================================
  // DASHBOARD — Railway: 4 separate endpoints
  // ==========================================================================

  /** GET /api/admin/dashboard/overview */
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    return apiFetch<DashboardOverview>("/api/admin/dashboard/overview");
  },

  /** GET /api/admin/dashboard/requests-by-status */
  getDashboardStatusCounts: async (): Promise<StatusCount[]> => {
    return apiFetch<StatusCount[]>("/api/admin/dashboard/requests-by-status");
  },

  /** GET /api/admin/dashboard/regional-trends */
  getDashboardRegionalTrends: async (): Promise<RegionDemand[]> => {
    return apiFetch<RegionDemand[]>("/api/admin/dashboard/regional-trends");
  },

  /** GET /api/admin/dashboard/participant-performance */
  getDashboardParticipantPerformance: async (): Promise<
    ParticipantPerformance[]
  > => {
    return apiFetch<ParticipantPerformance[]>(
      "/api/admin/dashboard/participant-performance"
    );
  },

  /**
   * Composite: fetch all 4 dashboard endpoints in parallel.
   * Returns the merged DashboardData for backward compat with the dashboard page.
   */
  getDashboardSummary: async (): Promise<DashboardData> => {
    const [summary, statusCounts, regionDemand, participantPerformance] =
      await Promise.all([
        api.getDashboardOverview(),
        api.getDashboardStatusCounts(),
        api.getDashboardRegionalTrends(),
        api.getDashboardParticipantPerformance(),
      ]);
    return { summary, statusCounts, regionDemand, participantPerformance };
  },

  // ==========================================================================
  // ORDERS — Railway: GET /api/admin/orders, /:id, PATCH /:id/status
  // ==========================================================================

  /** GET /api/admin/orders  Query: page, limit, sortBy, sortOrder, status, customer_id, manufacturer_id, startDate, endDate, search */
  getOrders: async (
    filters: OrderFilters = {}
  ): Promise<PaginatedResponse<OrderListItem>> => {
    const params = buildParams(filters);
    return apiFetch<PaginatedResponse<OrderListItem>>(
      `/api/admin/orders?${params.toString()}`
    );
  },

  /** GET /api/admin/orders/:id */
  getOrderById: async (id: string): Promise<OrderDetail> => {
    return apiFetch<OrderDetail>(`/api/admin/orders/${id}`);
  },

  /** PATCH /api/admin/orders/:id/status  Body: { status, tracking_number? } */
  updateOrderStatus: async (
    id: string,
    status: string,
    trackingNumber?: string
  ): Promise<unknown> => {
    return apiFetch(`/api/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
      }),
    });
  },

  // ==========================================================================
  // SAMPLE ORDERS — Railway: GET /api/admin/sample-orders, /:id, PATCH /:id/status
  // ==========================================================================

  /** GET /api/admin/sample-orders  Query: page, limit, sortBy, sortOrder, status, manufacturer_id, customer_id, startDate, endDate, search */
  getSampleOrders: async (
    filters: OrderFilters = {}
  ): Promise<PaginatedResponse<OrderListItem>> => {
    const params = buildParams(filters);
    return apiFetch<PaginatedResponse<OrderListItem>>(
      `/api/admin/sample-orders?${params.toString()}`
    );
  },

  /** GET /api/admin/sample-orders/:id */
  getSampleOrderById: async (id: string): Promise<OrderDetail> => {
    return apiFetch<OrderDetail>(`/api/admin/sample-orders/${id}`);
  },

  /** PATCH /api/admin/sample-orders/:id/status  Body: { status, admin_response? } */
  updateSampleOrderStatus: async (
    id: string,
    status: string,
    adminResponse?: string
  ): Promise<unknown> => {
    return apiFetch(`/api/admin/sample-orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        ...(adminResponse ? { admin_response: adminResponse } : {}),
      }),
    });
  },

  // ==========================================================================
  // UNIFIED REQUESTS — Railway: GET /api/admin/requests, /:id, /:id/history, /:id/reassign
  // ==========================================================================

  /** GET /api/admin/requests  Query: page, limit, type, status, manufacturer_id, customer_id, state, from_date, to_date, sortBy, sortOrder */
  getRequests: async (
    filters: RequestFiltersParams = {}
  ): Promise<PaginatedResponse<OrderListItem>> => {
    const params = buildParams(filters);
    return apiFetch<PaginatedResponse<OrderListItem>>(
      `/api/admin/requests?${params.toString()}`
    );
  },

  /** GET /api/admin/requests/:id — unified detail for any request type */
  getRequestById: async (id: string): Promise<OrderDetail> => {
    return apiFetch<OrderDetail>(`/api/admin/requests/${id}`);
  },

  /** GET /api/admin/requests/:id/history */
  getRequestHistory: async (
    id: string
  ): Promise<{ data: unknown[] }> => {
    return apiFetch(`/api/admin/requests/${id}/history`);
  },

  /** PATCH /api/admin/requests/:id/reassign  Body: { new_manufacturer_id, reason } */
  reassignManufacturer: async (
    requestId: string,
    newManufacturerId: string,
    reason: string
  ): Promise<unknown> => {
    return apiFetch(`/api/admin/requests/${requestId}/reassign`, {
      method: "PATCH",
      body: JSON.stringify({
        new_manufacturer_id: newManufacturerId,
        reason,
      } satisfies ReassignRequestDto),
    });
  },

  // ==========================================================================
  // PARTICIPANTS — Railway: GET /api/admin/participants, /:id, /:id/activate, /:id/deactivate, /:id/performance
  // ==========================================================================

  /** GET /api/admin/participants  Query: page, limit, type, state, is_verified, is_active */
  getParticipants: async (
    filters: ParticipantFilters
  ): Promise<PaginatedResponse<Participant>> => {
    const params = buildParams({
      ...filters,
      type: toApiParticipantType(filters.type),
    });
    // Remove the original 'type' if it was uppercase (already converted)
    return apiFetch<PaginatedResponse<Participant>>(
      `/api/admin/participants?${params.toString()}`
    );
  },

  /** GET /api/admin/participants/:id */
  getParticipantById: async (id: string): Promise<ParticipantDetail> => {
    return apiFetch<ParticipantDetail>(`/api/admin/participants/${id}`);
  },

  /** PATCH /api/admin/participants/:id/activate */
  activateParticipant: async (id: string): Promise<unknown> => {
    return apiFetch(`/api/admin/participants/${id}/activate`, {
      method: "PATCH",
    });
  },

  /** PATCH /api/admin/participants/:id/deactivate  Body: { reason } */
  deactivateParticipant: async (
    id: string,
    reason: string
  ): Promise<unknown> => {
    return apiFetch(`/api/admin/participants/${id}/deactivate`, {
      method: "PATCH",
      body: JSON.stringify({ reason } satisfies DeactivateParticipantDto),
    });
  },

  /** Convenience: toggle active state (backward compat) */
  toggleParticipant: async (
    participantId: string,
    isActive: boolean,
    _type?: string,
    reason?: string
  ): Promise<unknown> => {
    if (isActive) {
      return api.activateParticipant(participantId);
    }
    return api.deactivateParticipant(participantId, reason || "Deactivated by admin");
  },

  /** GET /api/admin/participants/:id/performance */
  getParticipantPerformance: async (id: string): Promise<unknown> => {
    return apiFetch(`/api/admin/participants/${id}/performance`);
  },

  // ==========================================================================
  // RATINGS — Railway: 5 GET endpoints under /api/admin/ratings/*
  // ==========================================================================

  /** GET /api/admin/ratings/:category */
  getRatings: async (category: RatingCategory): Promise<RatingItem[]> => {
    const res = await apiFetch<ListRatingsResponse>(
      `/api/admin/ratings/${category}`
    );
    return res.data;
  },

  /** Convenience: fetch all 5 rating categories */
  getAllRatings: async (): Promise<RatingItem[]> => {
    const categories: RatingCategory[] = [
      "manufacturer-coal",
      "manufacturer-transport",
      "coal-provider-manufacturer",
      "transport-provider-manufacturer",
      "labour-contractor",
    ];
    const results = await Promise.all(
      categories.map((cat) => api.getRatings(cat))
    );
    return results.flat();
  },

  /** Backward compat: getReviews → getAllRatings */
  getReviews: async (): Promise<RatingItem[]> => {
    return api.getAllRatings();
  },

  /** Delete review — GAP: not in Railway contract. Stub for backward compat. */
  deleteReview: async (
    _reviewId: string,
    _sourceTable?: string
  ): Promise<{ success: boolean }> => {
    throw new Error(
      "Delete review is not available in the current backend API. Contact the backend team."
    );
  },

  // ==========================================================================
  // MANUFACTURER OPTIONS — local backend utility (not in Railway)
  // ==========================================================================

  getManufacturerOptions: async (): Promise<ManufacturerOption[]> => {
    // Try dedicated endpoint first, fall back to participants list
    try {
      return await apiFetch<ManufacturerOption[]>(
        "/api/admin/orders/manufacturer-options"
      );
    } catch {
      // Fallback: fetch manufacturers via participants endpoint
      const res = await api.getParticipants({
        type: "MANUFACTURER",
        limit: 100,
      });
      return res.data.map((p) => ({
        id: p.id,
        name: p.name,
        companyName: p.companyName,
        state: p.state,
        city: p.city,
      }));
    }
  },

  // ==========================================================================
  // ADMIN USERS — local backend only (GAP: not in Railway Swagger)
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
