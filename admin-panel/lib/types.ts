// ============================================================
// e-ENT Bazaar Admin Panel — Frontend Type Definitions
// ============================================================
// ALIGNED WITH RAILWAY BACKEND API CONTRACT (Swagger)
// https://e-ent-bazar-backend.up.railway.app/api/docs
// ============================================================

// ---------- Enums / Union types ----------

/** Order statuses from Railway: orders */
export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";

/** Sample order statuses from Railway: sample_orders */
export type SampleOrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

/** Legacy alias used by some UI components */
export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Rejected";

/** Railway API participant type values (query param) */
export type ParticipantApiType =
  | "manufacturer"
  | "transport_provider"
  | "coal_provider"
  | "labour_contractor";

/** Frontend display participant types (includes ENDCUSTOMER for UI routing) */
export type ParticipantType =
  | "MANUFACTURER"
  | "ENDCUSTOMER"
  | "COAL_PROVIDER"
  | "TRANSPORT_PROVIDER"
  | "LABOUR_CONTRACTOR";

/** Discriminator for the two order tables */
export type OrderType = "SAMPLE" | "NORMAL";

/** Request type for unified /api/admin/requests endpoint */
export type RequestType = "inquiry" | "quotation" | "order" | "sample_order";

/** DB: admin_users.role (text) */
export type AdminRole = "super_admin" | "admin" | "operation_manager" | "content_team";

/** Modules that Super Admin can grant access to (kis module ka access) */
export type ModuleId = "dashboard" | "requests" | "participants" | "reviews" | "cms";

/** Per-module access: no access, view only, or view + edit */
export type AccessLevel = "none" | "view" | "edit";

/** Per-user access config: module → level (Super Admin configures this) */
export type UserModuleAccess = Partial<Record<ModuleId, AccessLevel>>;

/** All admin users' access config keyed by userId */
export type AccessConfigMap = Record<string, UserModuleAccess>;

/** Actions available per module in the permission matrix */
export type PermissionAction = "view" | "create" | "edit" | "delete";

/** Per-module permission: which actions are allowed */
export type ModulePermissions = Record<PermissionAction, boolean>;

/** A role definition with its permission matrix */
export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  permissions: Record<ModuleId, ModulePermissions>;
}

/** All roles keyed by role id */
export type RolePermissionsMap = Record<string, RoleDefinition>;

// ---------- Auth — DB: admin_users ----------

export interface AdminUser {
  id: string;                   // admin_users.id
  email: string;                // admin_users.email
  name: string;                 // admin_users.name
  phone: string | null;         // admin_users.phone
  isActive: boolean;            // admin_users.is_active
  role: string;                 // admin_users.role (text)
  createdAt: string;            // admin_users.created_at
  updatedAt: string;            // admin_users.updated_at
  lastLogin: string | null;     // admin_users.last_login
  loginAttempts: number;        // admin_users.login_attempts
  blockedUntil: string | null;  // admin_users.blocked_until
}

// LoginCredentials removed — login is now Phone + OTP based

// ---------- Dashboard (Railway: 4 separate endpoints) ----------

/** GET /api/admin/dashboard/overview */
export interface DashboardOverview {
  totalSampleOrders: number;
  totalOrders: number;
  pendingSampleOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  completionRate: number;
  // Backend may send additional fields; keep flexible
  [key: string]: unknown;
}

/** For backward‑compat with KPISection */
export type DashboardSummary = DashboardOverview;

/** GET /api/admin/dashboard/requests-by-status */
export interface StatusCount {
  status: string;
  count: number;
}

/** GET /api/admin/dashboard/regional-trends */
export interface RegionDemand {
  state: string;
  totalOrders: number;
  delivered: number;
  pending: number;
}

/** GET /api/admin/dashboard/participant-performance */
export interface ParticipantPerformance {
  id: string;
  name: string;
  companyName: string;
  type: string;
  totalOrders: number;
  completedOrders: number;
  averageRating: number;
  [key: string]: unknown;
}

/** Aging items — kept for backward‑compat (not a separate Railway endpoint) */
export interface AgingRequest {
  id: string;
  tableName: "sample_orders" | "orders";
  customerName: string;
  manufacturerName: string;
  productName: string;
  status: string;
  hoursInPending: number;
  createdAt: string;
}

/** Composite dashboard data (assembled from 4 Railway endpoints) */
export interface DashboardData {
  summary: DashboardOverview;
  statusCounts: StatusCount[];
  regionDemand: RegionDemand[];
  participantPerformance: ParticipantPerformance[];
}

// ---------- Unified Order List Item ----------
// Used by both Sample Orders and Orders list pages.
// Covers columns common to sample_orders + orders, plus resolved JOIN names.

export interface OrderListItem {
  id: string;
  orderType: OrderType;         // Which table: "SAMPLE" → sample_orders, "NORMAL" → orders

  // Real DB columns (present in BOTH tables)
  customerId: string;           // *.customer_id
  manufacturerId: string;       // *.manufacturer_id
  productId: string;            // *.product_id
  quantity: number;             // *.quantity
  price: number | null;         // *.price
  totalAmount: number | null;   // *.total_amount
  deliveryAddress: string;      // *.delivery_address
  contactNumber: string;        // *.contact_number
  status: string;               // *.status
  createdAt: string;            // *.created_at
  updatedAt: string;            // *.updated_at

  // sample_orders only
  adminResponse?: string | null;  // sample_orders.admin_response
  adminId?: string | null;        // sample_orders.admin_id

  // orders only
  trackingNumber?: string | null; // orders.tracking_number

  // Resolved via JOINs (not DB columns — populated by backend)
  customerName?: string;          // endcustomers.name (via customer_id)
  manufacturerName?: string;      // manufacturers.name (via manufacturer_id)
  productName?: string;           // products.name (via product_id)
}

// ---------- Order Detail ----------
// For the /requests/[id] detail page.

export interface OrderParticipant {
  id: string;
  name: string;                   // endcustomers.name or manufacturers.name
  companyName: string;            // endcustomers.company_name or manufacturers.company_name
  email: string;
  phone: string;
  state: string;                  // *.state
  district: string;               // *.district
  city: string;                   // *.city
}

export interface StatusHistoryEntry {
  id: string;
  toStatus: RequestStatus;
  changedBy: string;
  createdAt: string;
  reason?: string;
}

export interface OrderDetail extends OrderListItem {
  customer: OrderParticipant;     // Resolved customer info
  manufacturer: OrderParticipant; // Resolved manufacturer info
  product: {
    id: string;
    name: string;                 // products.name
    category: string;             // products.category
    price: number | null;         // products.price
    priceUnit: string | null;     // products.price_unit
  };
  statusHistory: StatusHistoryEntry[];
}

// ---------- Order Filters ----------

/** Shared filter params (both orders & sample-orders endpoints) */
export interface OrderFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  customer_id?: string;
  manufacturer_id?: string;
  startDate?: string;
  endDate?: string;
}

/** Filters for unified /api/admin/requests endpoint */
export interface RequestFiltersParams {
  type?: RequestType;
  status?: string;
  manufacturer_id?: string;
  customer_id?: string;
  state?: string;
  from_date?: string;
  to_date?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// ---------- Paginated Response (Railway: PaginationMetaDto) ----------

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------- Unified Participant (for shared list component) ----------
// Common columns that exist across ALL participant tables.

export interface Participant {
  id: string;
  type: ParticipantType;
  name: string;                 // *.name
  email: string;                // *.email
  phone: string;                // *.phone
  companyName: string;          // *.company_name
  state: string;                // *.state
  district: string;             // *.district
  city: string;                 // *.city
  category: string;             // *.category
  createdAt: string;            // *.created_at
}

export interface ParticipantFilters {
  type: ParticipantType;
  search?: string;
  page?: number;
  limit?: number;
  state?: string;
  is_verified?: boolean;
  is_active?: boolean;
}

/** DTO for deactivating a participant (Railway requires reason) */
export interface DeactivateParticipantDto {
  reason: string;
}

/** Participant detail (GET /api/admin/participants/:id) */
export interface ParticipantDetail extends Participant {
  is_active?: boolean;
  is_verified?: boolean;
  [key: string]: unknown;
}

/** Reassign request DTO (PATCH /api/admin/requests/:id/reassign) */
export interface ReassignRequestDto {
  new_manufacturer_id: string;
  reason: string;
}

// ---------- Products — DB: products ----------

export interface Product {
  id: string;
  manufacturerId: string;       // products.manufacturer_id
  name: string;                 // products.name
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  category: string;
  isAvailable: boolean;
  specifications: Record<string, unknown> | null;
  priceUnit: string | null;
  dimensions: string | null;
  stockQuantity: number | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Manufacturer option for reassign ----------

export interface ManufacturerOption {
  id: string;                   // manufacturers.id
  name: string;                 // manufacturers.name
  companyName: string;          // manufacturers.company_name
  state: string;                // manufacturers.state
  city: string;                 // manufacturers.city
}

// ---------- Reviews & Ratings ----------
// Railway: 5 separate GET /api/admin/ratings/* endpoints
// Response: ListRatingsResponseDto { data: RatingItemDto[] }

/** Rating categories matching Railway endpoints */
export type RatingCategory =
  | "manufacturer-coal"
  | "manufacturer-transport"
  | "coal-provider-manufacturer"
  | "transport-provider-manufacturer"
  | "labour-contractor";

/** Single rating item from Railway */
export interface RatingItem {
  id: string;
  rating: number;
  reviewTitle: string | null;
  reviewText: string | null;
  isVerified: boolean;
  wouldRecommend: boolean;
  createdAt: string;
  reviewerName: string;
  reviewerType: string;
  revieweeName: string;
  revieweeType: string;
  sourceTable?: string;
}

/** Backward-compat alias */
export type Review = RatingItem;

/** Response from each rating endpoint */
export interface ListRatingsResponse {
  data: RatingItem[];
}
