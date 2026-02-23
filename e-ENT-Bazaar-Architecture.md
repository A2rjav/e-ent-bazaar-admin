# e-ENT Bazaar — Admin Panel Technical Architecture Document

---

## 1. System Architecture

### 1.1 High-Level Component Flow

```
┌─────────────────────┐
│   Next.js Frontend   │  (Admin Panel SPA)
│   (App Router)       │
│   Port: 3000         │
└────────┬────────────┘
         │  HTTPS (REST / JSON)
         │  Authorization: Bearer <JWT>
         ▼
┌─────────────────────┐
│   NestJS Backend     │  (API Gateway + Business Logic)
│   Port: 4000         │
│                      │
│  ┌─────────────────┐ │
│  │  Auth Guard     │ │  ← JWT verification on every request
│  │  RBAC Guard     │ │  ← Permission check per route
│  │  Audit Interceptor │  ← Logs every mutating action
│  └─────────────────┘ │
└────────┬────────────┘
         │  Prisma Client (connection pooling via Neon)
         ▼
┌─────────────────────┐
│  PostgreSQL (Neon)   │
│  - Admin schema      │
│  - Marketplace schema│
└──────────────────────┘
```

**Key design decisions:**

- The Next.js frontend is a **server-side-rendered admin SPA** using the App Router. API calls to NestJS are made from client components via a shared API client with automatic token refresh.
- The NestJS backend is the **single source of truth** for all business logic. The frontend never talks to the database directly.
- Neon Postgres is accessed exclusively through Prisma. Connection pooling is handled via Neon's built-in pooler (`pgbouncer` mode) to avoid connection exhaustion.

### 1.2 Authentication Flow

```
 Admin User                Next.js               NestJS                Postgres
     │                        │                     │                      │
     │── Login (email/pass) ──►                     │                      │
     │                        │── POST /auth/login ─►                      │
     │                        │                     │── Verify bcrypt hash ─►
     │                        │                     │◄─ User + Roles ──────│
     │                        │                     │                      │
     │                        │                     │── Generate JWT pair   │
     │                        │                     │   (access: 15min,     │
     │                        │                     │    refresh: 7d)       │
     │                        │◄─ { accessToken,    │                      │
     │                        │     refreshToken }  │                      │
     │◄─ Set httpOnly cookies─│                     │                      │
     │                        │                     │                      │
     │── Subsequent request ──►                     │                      │
     │   (cookie attached)    │── Forward Bearer ───►                      │
     │                        │                     │── Validate JWT ───────►
     │                        │                     │── Check RBAC ─────────►
     │                        │◄── Response ────────│                      │
```

**Token strategy:**

- **Access token** — short-lived (15 min), JWT, contains `{ sub: adminId, roles: [...], permissions: [...] }`.
- **Refresh token** — longer-lived (7 days), stored as `httpOnly` + `Secure` + `SameSite=Strict` cookie and persisted (hashed) in a `refresh_tokens` table so it can be revoked.
- On access token expiry, the frontend silently calls `POST /auth/refresh`. If the refresh token is also expired or revoked, the user is redirected to login.
- All admin logins are logged in the `audit_logs` table.

### 1.3 Authorization (RBAC) Strategy

The RBAC model follows a **Role → Permission** mapping pattern with route-level enforcement via NestJS Guards.

```
AdminUser  ──M:N──  Role  ──M:N──  Permission
```

**Day-1 roles and their permission sets:**

| Role | Permissions |
|---|---|
| **Super Admin** | `*` (all permissions) |
| **Operations Manager** | `requests.read`, `requests.reassign`, `participants.read`, `participants.disable`, `orders.read`, `dashboard.read`, `ratings.delete` |
| **Content Team** | `cms.read`, `cms.write`, `cms.delete` |

**Permissions are string-based and hierarchical:**

- `requests.*` grants all request sub-permissions.
- `requests.read` grants only read.
- This enables future granularity without schema changes.

**Enforcement mechanism (NestJS):**

1. A `@Permissions('requests.read')` custom decorator is placed on each controller method.
2. A global `RbacGuard` runs after `JwtAuthGuard`. It extracts the user's permissions from the JWT payload and checks against the required permission set.
3. Super Admin role bypasses all checks (has wildcard `*`).

**Scalability:** New roles are added via a database seed or admin UI — no code changes needed. New permissions are added to the `permissions` table and assigned to roles.

---

## 2. Database Design (Prisma / Postgres)

### 2.1 Entity Relationship Overview

```
┌──────────────┐       ┌────────────────┐       ┌──────────────────┐
│  admin_users │──M:N──│ admin_user_roles│──M:N──│      roles       │
└──────┬───────┘       └────────────────┘       └───────┬──────────┘
       │                                                 │
       │                                        ┌────────┴─────────┐
       │                                        │  role_permissions │──M:N──┐
       │                                        └──────────────────┘       │
       │                                                            ┌──────┴───────┐
       │                                                            │  permissions  │
       │                                                            └──────────────┘
       │
       │  (audit_logs reference admin who acted)
       ▼
┌──────────────┐
│  audit_logs  │
└──────────────┘

┌──────────────┐       ┌────────────────────────┐
│    users     │──1:N──│  participant_profiles   │  (one user, many types)
│  (platform)  │       │  type: ENUM             │
└──────┬───────┘       └────────┬───────────────┘
       │                        │
       │               ┌────────┴───────────────┐
       │               │  request_participants   │  (junction: request ↔ participant)
       │               └────────┬───────────────┘
       │                        │
       │               ┌────────┴───────────────┐
       │──1:N─────────►│       requests          │
       │               └────────┬───────────────┘
       │                        │
       │               ┌────────┴───────────────┐
       │               │ request_status_history  │  (state machine log)
       │               └────────────────────────┘
       │
       │               ┌────────────────────────┐
       └──1:N─────────►│   ratings_reviews      │
                       └────────────────────────┘
```

### 2.2 Detailed Table Designs

#### `admin_users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | `gen_random_uuid()` |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL |
| `password_hash` | VARCHAR(255) | bcrypt, NOT NULL |
| `full_name` | VARCHAR(255) | |
| `is_active` | BOOLEAN | Default `true` |
| `last_login_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `UNIQUE(email)`, `INDEX(is_active)`

#### `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `name` | VARCHAR(100) | UNIQUE — e.g. `SUPER_ADMIN` |
| `display_name` | VARCHAR(255) | Human-friendly label |
| `description` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

#### `permissions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `key` | VARCHAR(255) | UNIQUE — e.g. `requests.reassign` |
| `description` | TEXT | |

#### `admin_user_roles` (junction)

| Column | Type |
|---|---|
| `admin_user_id` | UUID (FK → admin_users) |
| `role_id` | UUID (FK → roles) |

**PK:** `(admin_user_id, role_id)`

#### `role_permissions` (junction)

| Column | Type |
|---|---|
| `role_id` | UUID (FK → roles) |
| `permission_id` | UUID (FK → permissions) |

**PK:** `(role_id, permission_id)`

#### `refresh_tokens`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `admin_user_id` | UUID (FK) | |
| `token_hash` | VARCHAR(255) | SHA-256 of refresh token |
| `expires_at` | TIMESTAMPTZ | |
| `revoked_at` | TIMESTAMPTZ | NULL if still valid |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `INDEX(admin_user_id)`, `INDEX(token_hash)`, `INDEX(expires_at)`

---

#### `users` (platform users — buyers, manufacturers, etc.)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `full_name` | VARCHAR(255) | |
| `email` | VARCHAR(255) | UNIQUE |
| `phone` | VARCHAR(20) | |
| `region` | VARCHAR(255) | City / State / Zone for analytics |
| `is_active` | BOOLEAN | Admins can disable |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `UNIQUE(email)`, `INDEX(region)`, `INDEX(is_active)`

#### `participant_profiles`

This table implements the **multi-type participation** model. One user can have multiple profiles (one per type).

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → users) | |
| `type` | ENUM(`MANUFACTURER`, `COAL_PROVIDER`, `TRANSPORT_PROVIDER`, `LABOUR_CONTRACTOR`, `BUYER`) | |
| `business_name` | VARCHAR(255) | |
| `gstin` | VARCHAR(15) | |
| `region` | VARCHAR(255) | |
| `is_verified` | BOOLEAN | Admin-controlled |
| `is_active` | BOOLEAN | Admin can disable |
| `metadata` | JSONB | Type-specific fields (capacity, fleet size, etc.) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:** `UNIQUE(user_id, type)`, `INDEX(type)`, `INDEX(region)`, `INDEX(is_active)`

**Design rationale:** Using a single table with a `type` enum (rather than separate tables per participant type) keeps the query model simple and avoids N joins. Type-specific fields go in `metadata` (JSONB) which is flexible and queryable in Postgres.

---

#### `requests`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `request_number` | VARCHAR(20) | Human-readable, auto-generated (e.g., `REQ-20260208-0001`) |
| `buyer_id` | UUID (FK → participant_profiles) | The buyer who created it |
| `manufacturer_id` | UUID (FK → participant_profiles) | Current assigned manufacturer |
| `status` | ENUM(`PENDING`, `APPROVED`, `QUOTED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `REJECTED`) | Current status |
| `material_type` | VARCHAR(255) | |
| `quantity` | DECIMAL(12,2) | |
| `unit` | VARCHAR(50) | e.g., `tonnes`, `bags` |
| `delivery_region` | VARCHAR(255) | |
| `delivery_address` | TEXT | |
| `special_instructions` | TEXT | |
| `quoted_price` | DECIMAL(14,2) | Set when status moves to QUOTED |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Indexes:**

- `INDEX(status)` — filtering by status on dashboard
- `INDEX(buyer_id)` — buyer's request list
- `INDEX(manufacturer_id)` — manufacturer's request list
- `INDEX(delivery_region)` — region analytics
- `INDEX(created_at)` — sorting / aging calculations
- `INDEX(status, created_at)` — composite for dashboard queries (aging in PENDING)

#### `request_participants` (junction: other participants assigned to a request)

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `request_id` | UUID (FK → requests) | |
| `participant_id` | UUID (FK → participant_profiles) | |
| `role_in_request` | ENUM(`TRANSPORT_PROVIDER`, `LABOUR_CONTRACTOR`, `COAL_PROVIDER`) | |
| `assigned_at` | TIMESTAMPTZ | |
| `assigned_by` | UUID (FK → admin_users, nullable) | NULL if system-assigned |

**Indexes:** `UNIQUE(request_id, participant_id, role_in_request)`, `INDEX(participant_id)`

#### `request_status_history`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `request_id` | UUID (FK → requests) | |
| `from_status` | ENUM (nullable) | NULL for initial creation |
| `to_status` | ENUM | |
| `changed_by_user_id` | UUID (nullable) | Platform user who triggered the change |
| `changed_by_admin_id` | UUID (nullable) | Admin who triggered (e.g., reassignment) |
| `reason` | TEXT | Optional reason for rejection/cancellation |
| `created_at` | TIMESTAMPTZ | When the transition happened |

**Indexes:** `INDEX(request_id, created_at)`, `INDEX(created_at)`

This table serves as the **immutable event log** for the request state machine. It is append-only.

---

#### `ratings_reviews`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `request_id` | UUID (FK → requests) | Tied to a specific completed request |
| `reviewer_id` | UUID (FK → participant_profiles) | Who left the review |
| `reviewee_id` | UUID (FK → participant_profiles) | Who is being reviewed |
| `rating` | SMALLINT | 1–5 |
| `review_text` | TEXT | |
| `is_removed` | BOOLEAN | Default `false`, soft-delete by admin |
| `removed_by` | UUID (FK → admin_users, nullable) | |
| `removed_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `INDEX(reviewee_id)`, `INDEX(request_id)`, `INDEX(is_removed)`

**Design note:** Admins soft-delete reviews (`is_removed = true`) rather than hard-deleting, preserving audit trail.

---

#### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `admin_user_id` | UUID (FK → admin_users, nullable) | NULL for system events |
| `action` | VARCHAR(255) | e.g., `ADMIN_LOGIN`, `REQUEST_REASSIGNED`, `PARTICIPANT_DISABLED`, `REVIEW_REMOVED`, `CMS_UPDATED` |
| `entity_type` | VARCHAR(100) | e.g., `Request`, `ParticipantProfile`, `RatingReview` |
| `entity_id` | UUID | ID of the affected record |
| `before_state` | JSONB | Snapshot before mutation |
| `after_state` | JSONB | Snapshot after mutation |
| `ip_address` | INET | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

**Indexes:**

- `INDEX(admin_user_id)` — "what did this admin do?"
- `INDEX(entity_type, entity_id)` — "what happened to this record?"
- `INDEX(action)` — filter by action type
- `INDEX(created_at)` — time-range queries

**Design note:** This table is **append-only**. No updates or deletes ever. For high-volume production, consider partitioning by `created_at` (monthly) after the table grows beyond ~10M rows.

### 2.3 Indexing Strategy Summary

| Goal | Index |
|---|---|
| Dashboard: count by status | `requests(status)` |
| Dashboard: aging in Pending | `requests(status, created_at)` composite |
| Dashboard: region demand | `requests(delivery_region)` |
| Participant lookup by type | `participant_profiles(type)` |
| Audit trail per entity | `audit_logs(entity_type, entity_id)` |
| Auth: token lookup | `refresh_tokens(token_hash)` |
| Request history timeline | `request_status_history(request_id, created_at)` |

---

## 3. Backend Architecture (NestJS)

### 3.1 Module Breakdown

```
src/
├── main.ts
├── app.module.ts                      # Root module
│
├── common/                            # Shared utilities
│   ├── decorators/
│   │   ├── permissions.decorator.ts   # @Permissions('requests.read')
│   │   └── current-user.decorator.ts  # @CurrentUser() extracts user from request
│   ├── guards/
│   │   ├── jwt-auth.guard.ts          # Validates JWT, attaches user to request
│   │   └── rbac.guard.ts             # Checks permissions against route requirement
│   ├── interceptors/
│   │   ├── audit.interceptor.ts       # Captures before/after state, writes audit log
│   │   └── transform.interceptor.ts   # Standardizes API response envelope
│   ├── filters/
│   │   └── http-exception.filter.ts   # Global error handler
│   ├── pipes/
│   │   └── validation.pipe.ts         # class-validator integration
│   ├── dto/
│   │   └── pagination.dto.ts          # Reusable pagination params
│   └── types/
│       └── index.ts                   # Shared types/enums
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts         # POST /auth/login, /auth/refresh, /auth/logout
│   │   ├── auth.service.ts            # JWT generation, bcrypt validation, token rotation
│   │   └── strategies/
│   │       └── jwt.strategy.ts        # Passport JWT strategy
│   │
│   ├── users/                         # Admin user management
│   │   ├── users.module.ts
│   │   ├── users.controller.ts        # CRUD for admin users (Super Admin only)
│   │   └── users.service.ts
│   │
│   ├── roles/                         # RBAC management
│   │   ├── roles.module.ts
│   │   ├── roles.controller.ts        # CRUD for roles & permission assignment
│   │   └── roles.service.ts
│   │
│   ├── participants/                  # Platform participant management
│   │   ├── participants.module.ts
│   │   ├── participants.controller.ts # List, view, verify, disable participants
│   │   └── participants.service.ts
│   │
│   ├── requests/                      # Request lifecycle management
│   │   ├── requests.module.ts
│   │   ├── requests.controller.ts     # List, view, reassign, view history
│   │   ├── requests.service.ts
│   │   └── request-state-machine.ts   # Transition validation logic
│   │
│   ├── ratings/                       # Ratings & reviews management
│   │   ├── ratings.module.ts
│   │   ├── ratings.controller.ts      # List, view, remove reviews
│   │   └── ratings.service.ts
│   │
│   ├── dashboard/                     # Analytics & metrics
│   │   ├── dashboard.module.ts
│   │   ├── dashboard.controller.ts    # GET /dashboard/summary, /dashboard/aging, etc.
│   │   └── dashboard.service.ts       # Raw SQL / Prisma aggregations
│   │
│   ├── audit/                         # Audit log viewer
│   │   ├── audit.module.ts
│   │   ├── audit.controller.ts        # GET /audit-logs (read-only, Super Admin)
│   │   └── audit.service.ts
│   │
│   └── cms/                           # Content management (placeholder for Content Team)
│       ├── cms.module.ts
│       ├── cms.controller.ts
│       └── cms.service.ts
│
├── prisma/
│   ├── prisma.module.ts               # Global Prisma service provider
│   ├── prisma.service.ts              # Extends PrismaClient, handles lifecycle
│   └── schema.prisma                  # Single schema file
│
└── config/
    ├── app.config.ts                  # Environment-based configuration
    └── jwt.config.ts                  # JWT secret, expiry settings
```

### 3.2 Guard Strategy for RBAC

The guard pipeline runs in this order on every request:

```
Request
  │
  ▼
JwtAuthGuard              ← Is the JWT valid? Attach admin user to req.user
  │
  ▼
RbacGuard                 ← Does req.user have the required permission(s)?
  │                          Read from @Permissions() decorator on the route.
  │                          If user has wildcard '*', bypass.
  ▼
Controller Method         ← Business logic executes
  │
  ▼
AuditInterceptor          ← If mutation, capture before/after and write audit log
  │
  ▼
TransformInterceptor      ← Wrap response in standard envelope: { success, data, meta }
```

Both guards are registered globally in `app.module.ts` but respect the `@Public()` decorator for unauthenticated routes (login, health check).

### 3.3 Request Visibility Filtering by Role

Not all admins see the same data. The filtering logic lives in the service layer, not the controller:

| Role | Requests Visible | Actions Allowed |
|---|---|---|
| **Super Admin** | All requests | All admin actions |
| **Operations Manager** | All requests | Read, reassign, disable participants, remove reviews |
| **Content Team** | No request access | CMS operations only |

The `RequestsService` accepts the current user's permissions and applies Prisma `where` clauses accordingly. If a future role needs scoped visibility (e.g., "Regional Manager sees only their region"), the service method accepts an optional `region` filter derived from the user's profile.

---

## 4. Request Lifecycle (State Machine)

### 4.1 State Transition Diagram

```
                           ┌──────────────┐
                           │              │
               ┌───────────│   PENDING    │───────────┐
               │           │              │           │
               │           └──────┬───────┘           │
               │                  │                   │
               │                  │ Manufacturer       │ Buyer
               │                  │ approves           │ cancels
               │                  ▼                   │
               │           ┌──────────────┐           │
               │           │              │           │
   Manufacturer│           │   APPROVED   │───────┐   │
   rejects     │           │              │       │   │
               │           └──────┬───────┘       │   │
               │                  │               │   │
               ▼                  │ Manufacturer   │   ▼
        ┌──────────────┐         │ provides quote  │  ┌──────────────┐
        │              │         ▼               │  │              │
        │   REJECTED   │  ┌──────────────┐       │  │  CANCELLED   │
        │              │  │              │       │  │              │
        └──────────────┘  │    QUOTED    │───────┤  └──────────────┘
                          │              │       │         ▲
                          └──────┬───────┘       │         │
                                 │               │ Buyer    │
                                 │ Manufacturer   │ cancels  │
                                 │ ships          │ (from    │
                                 ▼               │ APPROVED  │
                          ┌──────────────┐       │ or QUOTED)│
                          │              │       │         │
                          │   SHIPPED    │───────┘─────────┘
                          │              │
                          └──────┬───────┘
                                 │
                                 │ Manufacturer
                                 │ confirms delivery
                                 ▼
                          ┌──────────────┐
                          │              │
                          │  DELIVERED   │  (terminal)
                          │              │
                          └──────────────┘
```

### 4.2 Transition Rules Table

| From | To | Triggered By | Conditions |
|---|---|---|---|
| `PENDING` | `APPROVED` | Manufacturer | Manufacturer accepts the request |
| `PENDING` | `REJECTED` | Manufacturer | Manufacturer declines |
| `PENDING` | `CANCELLED` | Buyer | Buyer withdraws |
| `APPROVED` | `QUOTED` | Manufacturer | Manufacturer provides price quote |
| `APPROVED` | `CANCELLED` | Buyer | Buyer cancels after approval |
| `QUOTED` | `SHIPPED` | Manufacturer | Goods dispatched |
| `QUOTED` | `CANCELLED` | Buyer | Buyer cancels after quote |
| `SHIPPED` | `DELIVERED` | Manufacturer | Delivery confirmed |
| `SHIPPED` | `CANCELLED` | Buyer | Buyer cancels (edge case, may be restricted) |

**Terminal states:** `DELIVERED`, `CANCELLED`, `REJECTED` — no further transitions.

### 4.3 Admin's Role in the State Machine

Admins **cannot** directly change a request's status (business rule). However, admins **can**:

- **Reassign** a request to a different manufacturer — this resets the status to `PENDING` and creates a new status history entry with `changed_by_admin_id` set and reason "Reassigned by admin".
- **View** the full status history of any request.

### 4.4 State Machine Implementation Strategy

The `RequestStateMachine` class in the backend will:

1. Define a `TRANSITIONS` map:

   ```
   TRANSITIONS = {
     PENDING:  [APPROVED, REJECTED, CANCELLED],
     APPROVED: [QUOTED, CANCELLED],
     QUOTED:   [SHIPPED, CANCELLED],
     SHIPPED:  [DELIVERED, CANCELLED],
   }
   ```

2. Expose a `canTransition(from, to): boolean` method.

3. Expose a `transition(requestId, toStatus, triggeredBy): Promise<Request>` method that:
   - Validates the transition is allowed.
   - Validates the actor has the right role for this transition.
   - Updates `requests.status` in a **transaction** alongside inserting into `request_status_history`.
   - Throws a `BadRequestException` with a clear message if the transition is invalid.

---

## 5. Dashboard & Analytics Strategy

### 5.1 Metrics and Computation Approach

All P0 dashboard metrics will be computed via **direct SQL queries** (using Prisma `$queryRaw`) against the live database. At this scale (early-stage product), materialized views or caching are not yet needed but the design allows easy migration to them.

#### Metric 1: Total Requests by Status

```sql
SELECT status, COUNT(*) as count
FROM requests
GROUP BY status;
```

- **Index used:** `requests(status)`
- **Complexity:** O(1) with index. Fast even at 100K+ rows.

#### Metric 2: Request Aging (Time in PENDING)

```sql
SELECT
  id, request_number,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 AS hours_in_pending
FROM requests
WHERE status = 'PENDING'
ORDER BY created_at ASC;
```

Additionally, aggregate aging buckets:

```sql
SELECT
  CASE
    WHEN NOW() - created_at < INTERVAL '24 hours' THEN '< 24h'
    WHEN NOW() - created_at < INTERVAL '72 hours' THEN '24h - 72h'
    WHEN NOW() - created_at < INTERVAL '7 days'   THEN '3d - 7d'
    ELSE '> 7d'
  END AS aging_bucket,
  COUNT(*) as count
FROM requests
WHERE status = 'PENDING'
GROUP BY aging_bucket;
```

- **Index used:** `requests(status, created_at)` composite

#### Metric 3: Response Rate per Manufacturer

"Response rate" = percentage of requests where the manufacturer moved the request out of `PENDING` (to `APPROVED` or `REJECTED`) versus those still stuck in `PENDING`.

```sql
SELECT
  pp.id AS manufacturer_id,
  pp.business_name,
  COUNT(*) AS total_received,
  COUNT(*) FILTER (WHERE r.status != 'PENDING') AS responded,
  ROUND(
    COUNT(*) FILTER (WHERE r.status != 'PENDING') * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) AS response_rate_pct
FROM requests r
JOIN participant_profiles pp ON r.manufacturer_id = pp.id
GROUP BY pp.id, pp.business_name
ORDER BY response_rate_pct ASC;
```

- **Index used:** `requests(manufacturer_id)`, `requests(status)`

#### Metric 4: Completion Rate (Delivered / Approved)

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
  COUNT(*) FILTER (WHERE status IN ('APPROVED','QUOTED','SHIPPED','DELIVERED')) AS total_progressed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'DELIVERED') * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('APPROVED','QUOTED','SHIPPED','DELIVERED')), 0),
    2
  ) AS completion_rate_pct
FROM requests;
```

#### Metric 5: Region-Wise Demand Analytics

```sql
SELECT
  delivery_region,
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'DELIVERED') AS delivered,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending
FROM requests
GROUP BY delivery_region
ORDER BY total_requests DESC;
```

- **Index used:** `requests(delivery_region)`

### 5.2 Performance Scaling Plan

| Stage | Strategy |
|---|---|
| **Now (< 100K requests)** | Direct queries with proper indexes. Response time < 200ms. |
| **Growth (100K–1M)** | Add **materialized views** refreshed every 5 minutes via a NestJS cron job (`@nestjs/schedule`). Dashboard reads from MV. |
| **Scale (1M+)** | Introduce a **read replica** for analytics. Dashboard queries hit the replica. Consider time-series partitioning on `requests.created_at`. |

---

## 6. Production Considerations

### 6.1 Pagination

All list endpoints follow **cursor-based pagination** for stable results under concurrent writes:

```
GET /requests?cursor=<lastId>&limit=20&sortBy=createdAt&sortOrder=desc
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "cursor": "uuid-of-last-item",
    "hasMore": true,
    "total": 1542
  }
}
```

- `total` is computed via a parallel `COUNT(*)` query (with same filters).
- For simple admin views where offset-based is acceptable, support `?page=1&limit=20` as well.

### 6.2 Indexing

Summary of all indexes (referenced throughout section 2):

- Composite indexes for multi-column filters: `(status, created_at)`, `(entity_type, entity_id)`, `(user_id, type)`
- Unique constraints double as indexes: `admin_users(email)`, `users(email)`, `participant_profiles(user_id, type)`
- Foreign keys are indexed by default in Prisma-generated migrations.
- JSONB fields (`metadata`, `before_state`, `after_state`) are **not indexed** initially. GIN indexes will be added only if query patterns emerge that require them.

### 6.3 Logging

**Structured logging** using `nestjs-pino` (Pino logger):

- Every request gets a unique `requestId` (UUID) injected via middleware.
- Log format: JSON with fields `{ timestamp, level, requestId, method, path, statusCode, duration, adminUserId }`.
- Log levels: `error` for exceptions, `warn` for auth failures, `info` for request lifecycle, `debug` for development.
- Logs are written to stdout and can be piped to any log aggregation system (CloudWatch, Datadog, etc.).

### 6.4 Error Handling

Global exception filter catches all errors and returns a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action.",
    "requestId": "abc-123"
  }
}
```

- `HttpException` subclasses for domain errors: `RequestTransitionException`, `ParticipantAlreadyDisabledException`, etc.
- Prisma errors (constraint violations, not found) are caught and translated into appropriate HTTP status codes.
- Unhandled exceptions return 500 with a generic message; full details are logged server-side only.

### 6.5 Security Best Practices

| Area | Implementation |
|---|---|
| **Password storage** | bcrypt with cost factor 12 |
| **JWT** | RS256 (asymmetric) preferred for production; HS256 acceptable for MVP. Short-lived access tokens. |
| **CORS** | Whitelist only the Next.js admin domain |
| **Rate limiting** | `@nestjs/throttler` — 100 requests/min per IP on auth routes, 1000/min on general routes |
| **Input validation** | `class-validator` + `class-transformer` on every DTO. Whitelist mode (strip unknown properties). |
| **SQL injection** | Prisma parameterized queries. `$queryRaw` uses tagged template literals with automatic parameterization. |
| **XSS** | Next.js has built-in XSS protection. API returns JSON only. |
| **CSRF** | Not needed since auth is via `httpOnly` cookies + `SameSite=Strict`. Double-submit cookie pattern as extra layer if needed. |
| **Secrets management** | All secrets via environment variables. Never committed to repo. Use Neon connection string with SSL. |
| **Helmet** | `@nestjs/helmet` middleware for security headers on the API. |

### 6.6 Scalability Planning

| Concern | Strategy |
|---|---|
| **Database connections** | Neon's built-in connection pooler. Prisma configured with `?pgbouncer=true&connection_limit=10`. |
| **Horizontal scaling** | NestJS is stateless (JWT-based). Can run multiple instances behind a load balancer. |
| **Audit log growth** | Partition `audit_logs` by month after 10M rows. Add a TTL policy to archive logs older than 2 years. |
| **Dashboard performance** | Materialized views + read replicas (see section 5.2). |
| **File storage** | Out of scope for P0 but when needed, use S3-compatible storage with signed URLs. Never store files in Postgres. |
| **Caching** | Not needed at P0. When needed, Redis for session cache and dashboard metric cache (5-min TTL). |

---

## 7. Implementation Roadmap

### Phase 1 — Foundation (Week 1–2)

| Step | Task | Details |
|---|---|---|
| 1.1 | **Project scaffolding** | Initialize NestJS project, Next.js project, configure monorepo or separate repos. Set up ESLint, Prettier, Husky. |
| 1.2 | **Database setup** | Create Neon Postgres project. Write Prisma schema for `admin_users`, `roles`, `permissions`, `admin_user_roles`, `role_permissions`, `refresh_tokens`. Run initial migration. |
| 1.3 | **Auth module** | Implement login, JWT issuance, refresh token rotation, logout. Write `JwtAuthGuard`. |
| 1.4 | **RBAC module** | Implement `RbacGuard`, `@Permissions()` decorator. Seed Day-1 roles and permissions. |
| 1.5 | **Audit logging** | Build `AuditInterceptor` and `audit_logs` table. Ensure login events are logged. |
| 1.6 | **Next.js auth integration** | Build login page, token storage (httpOnly cookie), auth context, protected route middleware. |

**Milestone:** Admin can log in, JWT works, RBAC enforced, audit logs captured.

---

### Phase 2 — Core Data Models (Week 3–4)

| Step | Task | Details |
|---|---|---|
| 2.1 | **Prisma schema expansion** | Add `users`, `participant_profiles`, `requests`, `request_status_history`, `request_participants`, `ratings_reviews`. Run migration. |
| 2.2 | **Participants module** | List, search, filter participants by type/region/status. Enable/disable. Verify. |
| 2.3 | **Requests module** | List all requests with filters (status, region, date range, manufacturer). View single request with full history. |
| 2.4 | **Request state machine** | Implement `RequestStateMachine` with transition validation. Wire to status history table. |
| 2.5 | **Reassignment** | Admin reassign endpoint — changes manufacturer, resets to PENDING, logs audit entry. |
| 2.6 | **Ratings module** | List reviews, soft-delete by admin. |

**Milestone:** All core CRUD and business logic operational. Request lifecycle fully functional.

---

### Phase 3 — Dashboard & Analytics (Week 5)

| Step | Task | Details |
|---|---|---|
| 3.1 | **Dashboard service** | Implement all 5 P0 metrics as raw SQL queries. |
| 3.2 | **Dashboard API** | `GET /dashboard/summary` (status counts, completion rate), `GET /dashboard/aging`, `GET /dashboard/response-rates`, `GET /dashboard/region-demand`. |
| 3.3 | **Dashboard UI** | Build Next.js dashboard page with cards, charts (use Recharts or Chart.js), and data tables. |

**Milestone:** Fully functional analytics dashboard with all P0 metrics.

---

### Phase 4 — Admin Panel UI (Week 5–6)

| Step | Task | Details |
|---|---|---|
| 4.1 | **Layout & navigation** | Sidebar, header, breadcrumbs. Role-based menu visibility. |
| 4.2 | **Participants UI** | Table with search/filter, detail view, enable/disable toggle. |
| 4.3 | **Requests UI** | Table with status chips, filter panel, detail view with timeline, reassign modal. |
| 4.4 | **Reviews UI** | Table with remove action, confirmation dialog. |
| 4.5 | **Audit log viewer** | Searchable/filterable table (Super Admin only). |
| 4.6 | **Admin user management** | CRUD for admin users, role assignment (Super Admin only). |

**Milestone:** Complete admin panel UI wired to all backend APIs.

---

### Phase 5 — Hardening & Production Readiness (Week 7)

| Step | Task | Details |
|---|---|---|
| 5.1 | **Error handling** | Global exception filter, Prisma error mapping, frontend error boundaries. |
| 5.2 | **Input validation** | Validate all DTOs with class-validator. Add Zod validation on Next.js forms. |
| 5.3 | **Rate limiting** | Configure `@nestjs/throttler` on auth and mutation routes. |
| 5.4 | **Security headers** | Helmet, CORS configuration, CSP. |
| 5.5 | **Pagination** | Ensure all list endpoints support cursor/offset pagination with consistent response format. |
| 5.6 | **Structured logging** | Integrate `nestjs-pino`. Add request ID correlation. |
| 5.7 | **Testing** | Unit tests for state machine, guards, services. Integration tests for auth flow and critical endpoints. |
| 5.8 | **Deployment** | CI/CD pipeline. Environment configs for staging and production. Neon branching for staging DB. |

**Milestone:** Production-ready, secure, tested admin panel ready for deployment.

---

### Phase 6 — Post-Launch Enhancements (Week 8+)

| Priority | Task |
|---|---|
| P1 | CMS module for Content Team |
| P1 | Email/notification triggers on status changes |
| P2 | Dashboard caching with materialized views |
| P2 | Bulk operations (bulk approve, bulk reassign) |
| P2 | Export to CSV/Excel for reports |
| P3 | Activity feed (real-time via SSE or WebSocket) |
| P3 | Advanced analytics (trend charts, YoY comparison) |

---

*Document prepared: February 8, 2026*
*Status: Awaiting review and approval before implementation begins.*
