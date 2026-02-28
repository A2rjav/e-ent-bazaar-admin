import type {
  AdminUser,
  DashboardData,
  DashboardOverview,
  StatusCount,
  RegionDemand,
  ParticipantPerformance,
  OrderListItem,
  OrderDetail,
  OrderParticipant,
  OrderType,
  Participant,
  ParticipantDetail,
  RatingItem,
  RatingCategory,
  ListRatingsResponse,
  OrderFilters,
  RequestFiltersParams,
  ParticipantFilters,
  ParticipantType,
  PaginatedResponse,
  PaginationMeta,
  DeactivateParticipantDto,
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

// ---------------------------------------------------------------------------
// Railway → Frontend mappers (snake_case → camelCase + unwrapping)
// ---------------------------------------------------------------------------



/** Railway uses lowercase types; frontend uses UPPERCASE */
const PARTICIPANT_TYPE_TO_RAILWAY: Record<string, string> = {
  MANUFACTURER: 'manufacturer',
  ENDCUSTOMER: 'endcustomer',
  COAL_PROVIDER: 'coal_provider',
  TRANSPORT_PROVIDER: 'transport_provider',
  LABOUR_CONTRACTOR: 'labour_contractor',
};
const PARTICIPANT_TYPE_FROM_RAILWAY: Record<string, string> = {
  manufacturer: 'MANUFACTURER',
  endcustomer: 'ENDCUSTOMER',
  coal_provider: 'COAL_PROVIDER',
  transport_provider: 'TRANSPORT_PROVIDER',
  labour_contractor: 'LABOUR_CONTRACTOR',
};

function mapOverview(raw: any): DashboardOverview {
  // Railway: { requests: { total, pending, ... }, participants: { ... }, revenue: { ... } }
  const r = raw.requests || {};
  const p = raw.participants || {};
  const rev = raw.revenue || {};
  const totalOrders = Number(r.total || 0);
  const delivered = Number(r.completed || r.delivered || 0);
  return {
    totalSampleOrders: 0, // Railway doesn't separate sample orders in overview
    totalOrders: totalOrders,
    pendingSampleOrders: 0,
    pendingOrders: Number(r.pending || 0),
    deliveredOrders: delivered,
    completionRate: totalOrders > 0 ? (delivered / totalOrders) * 100 : 0,
    totalManufacturers: Number(p.total_manufacturers || 0),
    totalEndcustomers: Number(p.total_endcustomers || 0),
    totalCoalProviders: Number(p.total_coal_providers || 0),
    totalTransportProviders: Number(p.total_transport_providers || 0),
    totalOrderValue: Number(rev.total_order_value || 0),
    avgCustomerRating: Number(raw.performance?.avg_customer_rating || 0),
  };
}

function mapStatusCounts(raw: any): StatusCount[] {
  // Railway: { data: [...], chart_data: { labels, values } }
  if (Array.isArray(raw)) return raw;
  if (raw.data && Array.isArray(raw.data) && raw.data.length > 0) {
    return raw.data.map((d: any) => ({ status: d.status || d.name, count: Number(d.count || d.value || 0) }));
  }
  // Fallback to chart_data
  const labels: string[] = raw.chart_data?.labels || [];
  const values: number[] = raw.chart_data?.values || [];
  return labels.map((label, i) => ({ status: label, count: values[i] || 0 }));
}

function mapRegionalTrends(raw: any): RegionDemand[] {
  // Railway: { data: [...], total_requests }
  const arr = Array.isArray(raw) ? raw : (raw.data || []);
  return arr.map((d: any) => ({
    state: d.state || d.region || '',
    totalOrders: Number(d.total_orders || d.totalOrders || d.total_requests || 0),
    delivered: Number(d.delivered || d.completed || 0),
    pending: Number(d.pending || 0),
  }));
}

function mapParticipantPerformance(raw: any): ParticipantPerformance[] {
  // Railway: { data: [...], metric, type }
  const arr = Array.isArray(raw) ? raw : (raw.data || []);
  return arr.map((d: any) => ({
    id: d.id || '',
    name: d.name || '',
    companyName: d.company_name || d.companyName || '',
    type: d.type || '',
    totalOrders: Number(d.total_orders || d.totalOrders || 0),
    completedOrders: Number(d.completed_orders || d.completedOrders || 0),
    averageRating: Number(d.avg_rating || d.averageRating || 0),
  }));
}

function mapParticipant(d: any): Participant {
  return {
    id: d.id || '',
    type: (PARTICIPANT_TYPE_FROM_RAILWAY[d.type] || d.type || 'MANUFACTURER') as ParticipantType,
    name: d.name || '',
    email: d.email || '',
    phone: d.phone || '',
    companyName: d.company_name || d.companyName || '',
    state: d.state || '',
    district: d.district || '',
    city: d.city || '',
    category: d.category || '',
    createdAt: d.created_at || d.createdAt || '',
  };
}

function mapOrderItem(d: any, orderType: 'SAMPLE' | 'NORMAL'): OrderListItem {
  return {
    id: d.id || '',
    orderType: orderType,
    customerId: d.customer_id || d.customerId || '',
    manufacturerId: d.manufacturer_id || d.manufacturerId || '',
    productId: d.product_id || d.productId || '',
    quantity: Number(d.quantity || 0),
    price: d.price != null ? Number(d.price) : null,
    totalAmount: d.total_amount != null ? Number(d.total_amount) : (d.totalAmount != null ? Number(d.totalAmount) : null),
    deliveryAddress: d.delivery_address || d.deliveryAddress || '',
    contactNumber: d.contact_number || d.contactNumber || '',
    status: d.status || '',
    createdAt: d.created_at || d.createdAt || '',
    updatedAt: d.updated_at || d.updatedAt || '',
    adminResponse: d.admin_response || d.adminResponse || null,
    adminId: d.admin_id || d.adminId || null,
    trackingNumber: d.tracking_number || d.trackingNumber || null,
    customerName: d.customer?.name || d.customerName || d.customer_name || undefined,
    manufacturerName: d.manufacturer?.name || d.manufacturerName || d.manufacturer_name || undefined,
    productName: d.product?.name || d.productName || d.product_name || undefined,
    // Store underlying request type from unified /requests endpoint
    requestType: d.type || undefined,
  };
}

/** Map Railway /api/admin/requests/:id?type=... response to OrderDetail */
function mapRequestDetail(raw: any): OrderDetail {
  const det = raw.details || {};
  const cust = raw.customer || {};
  const mfr = raw.manufacturer || {};

  function mapParticipantObj(p: any): OrderParticipant {
    return {
      id: p.id || '',
      name: p.name || '',
      companyName: p.company_name || p.companyName || '',
      email: p.email || '',
      phone: p.phone || '',
      state: p.state || '',
      district: p.district || '',
      city: p.city || '',
    };
  }

  // Determine orderType from request type
  const orderType: OrderType = raw.type === 'sample_order' ? 'SAMPLE' : 'NORMAL';

  return {
    id: raw.id || '',
    orderType,
    customerId: cust.id || '',
    manufacturerId: mfr.id || '',
    productId: det.product_id || raw.product_id || '',
    quantity: Number(det.quantity || raw.quantity || 0),
    price: det.price != null ? Number(det.price) : null,
    totalAmount: det.total_amount != null ? Number(det.total_amount) : null,
    deliveryAddress: det.delivery_address || '',
    contactNumber: det.contact_number || '',
    status: raw.status || '',
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
    adminResponse: det.admin_response || null,
    adminId: null,
    trackingNumber: det.tracking_number || null,
    customerName: cust.name || '',
    manufacturerName: mfr.name || '',
    productName: det.product_name || raw.product_name || '',

    // Resolved nested objects
    customer: mapParticipantObj(cust),
    manufacturer: mapParticipantObj(mfr),
    product: {
      id: det.product_id || raw.product_id || '',
      name: det.product_name || raw.product_name || raw.type || '',
      category: det.category || '',
      price: det.price != null ? Number(det.price) : null,
      priceUnit: det.price_unit || null,
    },
    statusHistory: (raw.timeline || []).map((t: any, i: number) => ({
      id: String(i),
      toStatus: t.event === 'created' ? 'Pending' : (t.event || t.status || ''),
      changedBy: t.changed_by || 'System',
      createdAt: t.timestamp || t.created_at || '',
      reason: t.description || undefined,
    })),
    requestType: raw.type || undefined,
  } as any;
}



export const api = {
  // ==========================================================================
  // AUTH — Railway: POST /api/admin/auth/*
  // ==========================================================================

  /** POST /api/admin/auth/send-otp  Body: { phone, countryCode } */
  sendOtp: async (
    phone: string,
    countryCode: string = "+91"
  ): Promise<{ success: boolean; code?: string }> => {
    const data = await apiFetch<{ success: boolean; code?: string }>("/api/admin/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone, countryCode }),
    });
    return { success: true, code: data.code };
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

  /** POST /api/admin/auth/api-key  Body: { apiKey } */
  loginWithApiKey: async (
    apiKey: string
  ): Promise<{ user: AdminUser; token: string }> => {
    const data = await apiFetch<Record<string, unknown>>(
      "/api/admin/auth/api-key",
      {
        method: "POST",
        body: JSON.stringify({ apiKey }),
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
    const data = await apiFetch<Record<string, unknown>>("/api/admin/auth/me");
    // Railway wraps in { success, admin: {...} }; local returns flat object
    const raw = (data.admin as Record<string, unknown>) || data;
    return {
      id: (raw.id as string) || "",
      email: (raw.email as string) || "",
      name: (raw.name as string) || "",
      phone: (raw.phone as string) || null,
      isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : (raw.is_active !== undefined ? Boolean(raw.is_active) : true),
      role: (raw.role as string) || "admin",
      createdAt: (raw.createdAt as string) || (raw.created_at as string) || new Date().toISOString(),
      updatedAt: (raw.updatedAt as string) || (raw.updated_at as string) || new Date().toISOString(),
      lastLogin: (raw.lastLogin as string) || (raw.last_login as string) || null,
      loginAttempts: Number(raw.loginAttempts || raw.login_attempts || 0),
      blockedUntil: (raw.blockedUntil as string) || (raw.blocked_until as string) || null,
    };
  },

  // ==========================================================================
  // DASHBOARD — Railway: 4 separate endpoints
  // ==========================================================================

  /** GET /api/admin/dashboard/overview */
  getDashboardOverview: async (): Promise<DashboardOverview> => {
    const raw = await apiFetch<Record<string, unknown>>("/api/admin/dashboard/overview");
    return mapOverview(raw);
  },

  /** GET /api/admin/dashboard/requests-by-status */
  getDashboardStatusCounts: async (): Promise<StatusCount[]> => {
    const raw = await apiFetch<unknown>("/api/admin/dashboard/requests-by-status");
    return mapStatusCounts(raw);
  },

  /** GET /api/admin/dashboard/regional-trends */
  getDashboardRegionalTrends: async (): Promise<RegionDemand[]> => {
    const raw = await apiFetch<unknown>("/api/admin/dashboard/regional-trends");
    return mapRegionalTrends(raw);
  },

  /** GET /api/admin/dashboard/participant-performance */
  getDashboardParticipantPerformance: async (): Promise<
    ParticipantPerformance[]
  > => {
    const raw = await apiFetch<unknown>(
      "/api/admin/dashboard/participant-performance"
    );
    return mapParticipantPerformance(raw);
  },

  /**
   * Composite dashboard fetch — calls 4 Railway sub-endpoints in parallel.
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
    const raw = await apiFetch<{ data: unknown[]; meta: PaginationMeta }>(
      `/api/admin/orders?${params.toString()}`
    );
    return { data: (raw.data || []).map((d: unknown) => mapOrderItem(d, 'NORMAL')), meta: raw.meta };
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
    const raw = await apiFetch<{ data: unknown[]; meta: PaginationMeta }>(
      `/api/admin/sample-orders?${params.toString()}`
    );
    return { data: (raw.data || []).map((d: unknown) => mapOrderItem(d, 'SAMPLE')), meta: raw.meta };
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
    const raw = await apiFetch<{ data: unknown[]; meta: PaginationMeta }>(
      `/api/admin/requests?${params.toString()}`
    );
    return { data: (raw.data || []).map((d: unknown) => mapOrderItem(d, (d as Record<string,unknown>).order_type === 'sample' ? 'SAMPLE' : 'NORMAL')), meta: raw.meta };
  },

  /** GET /api/admin/requests/:id?type=... — unified detail for any request type */
  getRequestById: async (id: string, requestType?: string): Promise<OrderDetail> => {
    const typeParam = requestType ? `?type=${requestType}` : '';
    const raw = await apiFetch<Record<string, unknown>>(`/api/admin/requests/${id}${typeParam}`);
    return mapRequestDetail(raw);
  },

  /** GET /api/admin/requests/:id/history */
  getRequestHistory: async (
    id: string
  ): Promise<{ data: unknown[] }> => {
    return apiFetch(`/api/admin/requests/${id}/history`);
  },

  // ==========================================================================
  // PARTICIPANTS — Railway: GET /api/admin/participants, /:id, /:id/activate, /:id/deactivate, /:id/performance
  // ==========================================================================

  /** GET /api/admin/participants  Query: page, limit, type, state, is_verified, is_active */
  getParticipants: async (
    filters: ParticipantFilters
  ): Promise<PaginatedResponse<Participant>> => {
    // Railway requires lowercase participant types
    const railwayFilters = {
      ...filters,
      type: PARTICIPANT_TYPE_TO_RAILWAY[filters.type] || filters.type?.toLowerCase(),
    };
    const params = buildParams(railwayFilters);
    const raw = await apiFetch<{ data: unknown[]; meta: PaginationMeta }>(
      `/api/admin/participants?${params.toString()}`
    );
    return {
      data: (raw.data || []).map((d: unknown) => mapParticipant(d)),
      meta: { ...raw.meta, hasNextPage: raw.meta.hasNextPage ?? false, hasPreviousPage: raw.meta.hasPreviousPage ?? false },
    };
  },

  /** GET /api/admin/participants/:id */
  getParticipantById: async (id: string): Promise<ParticipantDetail> => {
    return apiFetch<ParticipantDetail>(`/api/admin/participants/${id}`);
  },

  /** PATCH /api/admin/participants/:id/activate */
  activateParticipant: async (type: ParticipantType, id: string): Promise<unknown> => {
    return apiFetch(`/api/admin/participants/${id}/activate`, {
      method: "PATCH",
    });
  },

  /** PATCH /api/admin/participants/:id/deactivate  Body: { reason } */
  deactivateParticipant: async (
    type: ParticipantType,
    id: string,
    reason: string
  ): Promise<unknown> => {
    return apiFetch(`/api/admin/participants/${id}/deactivate`, {
      method: "PATCH",
      body: JSON.stringify({ reason } satisfies DeactivateParticipantDto),
    });
  },

  /** Convenience: toggle active state */
  toggleParticipant: async (
    participantId: string,
    isActive: boolean,
    type: ParticipantType,
    reason?: string
  ): Promise<unknown> => {
    if (isActive) {
      return api.activateParticipant(type, participantId);
    }
    return api.deactivateParticipant(type, participantId, reason || "Deactivated by admin");
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
