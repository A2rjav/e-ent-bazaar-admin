// ============================================================
// e-ENT Bazaar Admin Panel — Frontend Type Definitions
// ============================================================
// ALIGNED WITH REAL DATABASE SCHEMA (Neon PostgreSQL)
// camelCase TS property = snake_case DB column
// Only columns that ACTUALLY EXIST in the database are included.
// ============================================================

// ---------- Enums / Union types ----------

/** DB: sample_orders.status / orders.status / inquiries.status (text) */
export type RequestStatus =
  | "Pending"
  | "Approved"
  | "Shipped"
  | "Delivered"
  | "Cancelled"
  | "Rejected";

/** Maps to separate DB tables */
export type ParticipantType =
  | "MANUFACTURER"
  | "ENDCUSTOMER"
  | "COAL_PROVIDER"
  | "TRANSPORT_PROVIDER"
  | "LABOUR_CONTRACTOR";

/** Discriminator for the two order tables */
export type OrderType = "SAMPLE" | "NORMAL";

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

// ---------- Dashboard ----------

export interface DashboardSummary {
  totalSampleOrders: number;
  totalOrders: number;
  pendingSampleOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  completionRate: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RegionDemand {
  state: string;                // Grouped by manufacturers.state / endcustomers.state
  totalOrders: number;
  delivered: number;
  pending: number;
}

/** Aging items — sample_orders/orders with status = 'Pending' */
export interface AgingRequest {
  id: string;
  tableName: "sample_orders" | "orders";
  customerName: string;         // Resolved from customer_id
  manufacturerName: string;     // Resolved from manufacturer_id
  productName: string;          // Resolved from product_id
  status: string;
  hoursInPending: number;       // Computed: NOW() - created_at
  createdAt: string;
}

export interface DashboardData {
  summary: DashboardSummary;
  statusCounts: StatusCount[];
  regionDemand: RegionDemand[];
  agingRequests: AgingRequest[];
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

export interface OrderFilters {
  orderType?: OrderType;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ---------- Paginated Response ----------

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

// ---------- Reviews ----------
// No unified rating table in DB — aggregated from various *_ratings tables.

export interface Review {
  id: string;
  sourceTable: string;          // Which rating table
  rating: number;               // *.rating
  reviewTitle: string | null;   // *.review_title
  reviewText: string | null;    // *.review_text / *.review
  isVerified: boolean;          // *.is_verified (where available)
  wouldRecommend: boolean;      // *.would_recommend / *.would_work_again
  createdAt: string;            // *.created_at
  // Resolved participant names
  reviewerName: string;
  reviewerType: string;
  revieweeName: string;
  revieweeType: string;
}
