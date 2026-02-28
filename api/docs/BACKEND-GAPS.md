# Backend Gaps — What's Missing in the API

> **Last updated:** Feb 2026
> **Frontend:** `admin-panel/` (Next.js 14)
> **Backend:** `api/` (NestJS 11 + Prisma + Neon PostgreSQL)

---

## 1. 🔴 Auth Module — NOT IMPLEMENTED (Critical)

The admin panel frontend expects a full authentication system, but the backend has **zero auth endpoints, zero JWT, zero guards**.

### What the frontend expects

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/auth/send-otp` | POST | Send OTP to admin phone `{ phone, countryCode }` |
| `/api/admin/auth/verify-otp` | POST | Verify OTP & return JWT `{ phone, code, countryCode }` → `{ access_token }` |
| `/api/admin/auth/google` | POST | Google OAuth login `{ idToken }` → `{ access_token }` |
| `/api/admin/auth/me` | GET | Get current user profile (JWT in header) → `AdminUser` |

### What needs to be built

1. **Install packages:**
   ```bash
   npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs
   npm install -D @types/passport-jwt @types/bcryptjs
   ```

2. **Create `src/auth/` module with:**
   - `auth.module.ts` — imports JwtModule with secret from env
   - `auth.controller.ts` — 4 endpoints above
   - `auth.service.ts` — OTP generation, verification, JWT signing
   - `jwt.strategy.ts` — Passport JWT strategy
   - `jwt-auth.guard.ts` — Guard to protect endpoints
   - `public.decorator.ts` — `@Public()` decorator to exempt auth endpoints
   - `dto/send-otp.dto.ts`, `dto/verify-otp.dto.ts`

3. **OTP flow:**
   - `send-otp`: Look up phone in `admin_users` table → generate 6-digit code → store in `otp_codes` table → send via SMS (or log to console in dev)
   - `verify-otp`: Look up latest unused OTP for phone → check expiry → mark as used → sign JWT with `{ sub: adminUser.id, role }` → return token
   - `otp_codes` table already exists in the DB schema

4. **JWT Guard:**
   - Apply `JwtAuthGuard` globally in `app.module.ts`
   - Use `@Public()` decorator on `send-otp`, `verify-otp`, and `google` endpoints
   - JWT payload: `{ sub: userId, role: string }`

5. **Environment variables needed:**
   ```env
   JWT_SECRET=your-secret-key
   JWT_EXPIRATION=7d
   # Optional: SMS provider (Twilio, MSG91, etc.)
   SMS_API_KEY=
   SMS_SENDER_ID=
   ```

### DB tables ready (no migration needed)

- `admin_users` — stores admin accounts (id, email, name, phone, role, is_active, etc.)
- `otp_codes` — stores OTP codes (phone, code, expires_at, used, auth_method)

### Current workaround

The frontend has a **demo login bypass** via the "Sign in with Google (Demo)" button that creates a local session without hitting any backend auth endpoint. This lets you use the panel while auth is being built.

---

## 2. 🔴 Order Status Update — NOT IMPLEMENTED

The frontend may need to update order statuses (Pending → Approved → Shipped → Delivered / Cancelled).

### Missing endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/admin/orders/:id/status` | PATCH | Update order status `{ status, reason? }` |

### What needs to be built

- In `orders.controller.ts`: add `@Patch(':id/status')` endpoint
- In `orders.service.ts`: look up order in `sample_orders` then `orders`, update status
- Optionally create a `status_history` table to track status changes with timestamps and who changed it

### Current state

- The `statusHistory` returned by `GET /api/admin/orders/:id` is **synthetically generated** (fake data), not from a real table
- No actual status update functionality exists

---

## 3. 🟡 Participant Toggle — Path Mismatch

### Frontend sends
```
PATCH /api/admin/participants/{TYPE}/{id}/{activate|deactivate}
```
Where `TYPE` = `MANUFACTURER`, `ENDCUSTOMER`, `COAL_PROVIDER`, `TRANSPORT_PROVIDER`, `LABOUR_CONTRACTOR`

### Backend expects
Need to verify the actual participant controller routes match this pattern. The participant types map to separate DB tables:
- `MANUFACTURER` → `Manufacturer` table
- `ENDCUSTOMER` → `endcustomers` table
- `COAL_PROVIDER` → `coal_providers` table
- `TRANSPORT_PROVIDER` → `transport_providers` table
- `LABOUR_CONTRACTOR` → `labour_contractors` table

### Action needed
- Verify `src/participants/participants.controller.ts` has the correct route pattern
- Ensure the service handles all 5 participant types

---

## 4. 🟡 Dashboard Response Shape

### Frontend expects (`DashboardData` type)
```typescript
{
  summary: {
    totalSampleOrders: number;
    totalOrders: number;
    pendingSampleOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    completionRate: number;
  };
  statusCounts: Array<{ status: string; count: number }>;
  regionDemand: Array<{ state: string; totalOrders: number; delivered: number; pending: number }>;
  agingRequests: Array<{ id; tableName; customerName; manufacturerName; productName; status; hoursInPending; createdAt }>;
}
```

### Action needed
- Verify `src/dashboard/dashboard.service.ts` returns data matching this exact shape
- Check property naming (camelCase vs snake_case)

---

## 5. 🟡 Reviews — Verify Endpoints

### Frontend calls
| Call | Endpoint |
|---|---|
| `getReviews()` | `GET /api/admin/reviews` |
| `deleteReview(id, table)` | `DELETE /api/admin/reviews/{table}/{id}` |

### Action needed
- Verify `src/reviews/` controller matches these paths
- The `sourceTable` parameter is used to select from different rating tables (manufacturer_coal_ratings, etc.)

---

## 6. 🟢 Working Endpoints (Verified)

These endpoints are implemented and the frontend correctly calls them:

| Module | Endpoint | Status |
|---|---|---|
| Orders | `GET /api/admin/orders?orderType=...&status=...&search=...&page=...&limit=...` | ✅ Working |
| Orders | `GET /api/admin/orders/:id` | ✅ Working |
| Orders | `PATCH /api/admin/orders/:id/reassign` | ✅ Working |
| Orders | `GET /api/admin/orders/manufacturer-options` | ✅ Working |
| Participants | `GET /api/admin/participants?type=...&search=...&page=...&limit=...` | ✅ Working |
| Admin Users | `GET /api/admin/users` | ✅ Working |
| Admin Users | `POST /api/admin/users` | ✅ Working |
| Admin Users | `PATCH /api/admin/users/:id` | ✅ Working |
| Admin Users | `DELETE /api/admin/users/:id` | ✅ Working |

---

## 7. Summary — Priority Order

| # | Gap | Severity | Effort |
|---|---|---|---|
| 1 | Auth module (OTP + JWT + Guards) | 🔴 Critical | ~2-3 days |
| 2 | Order status update endpoint | 🔴 High | ~0.5 day |
| 3 | Participant toggle path verification | 🟡 Medium | ~1 hour |
| 4 | Dashboard response shape verification | 🟡 Medium | ~1 hour |
| 5 | Reviews endpoint verification | 🟡 Medium | ~1 hour |
