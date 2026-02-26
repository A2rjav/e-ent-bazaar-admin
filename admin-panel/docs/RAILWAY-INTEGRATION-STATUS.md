# Railway API Integration Status

> **Backend Contract**: `https://e-ent-bazar-backend.up.railway.app/api/docs`  
> **Frontend**: `admin-panel/lib/api.ts` + `admin-panel/lib/types.ts`  
> **Last Updated**: Session — June 2025

---

## ✅ Fully Aligned Endpoints

These frontend API calls now match the Railway Swagger contract exactly.

### Auth (`/api/admin/auth/*`)
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.sendOtp(phone, countryCode)` | `POST /api/admin/auth/send-otp` | ✅ Aligned |
| `api.verifyOtp(phone, code, countryCode)` | `POST /api/admin/auth/verify-otp` | ✅ Aligned (field: `code`) |
| `api.loginWithGoogle(idToken)` | `POST /api/admin/auth/google` | ✅ Aligned |
| `api.getCurrentUser()` | `GET /api/admin/auth/me` | ✅ Aligned |

### Dashboard (`/api/admin/dashboard/*`) — 4 separate endpoints
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getDashboardOverview()` | `GET /api/admin/dashboard/overview` | ✅ Aligned |
| `api.getDashboardStatusCounts()` | `GET /api/admin/dashboard/requests-by-status` | ✅ Aligned |
| `api.getDashboardRegionalTrends()` | `GET /api/admin/dashboard/regional-trends` | ✅ Aligned |
| `api.getDashboardParticipantPerformance()` | `GET /api/admin/dashboard/participant-performance` | ✅ Aligned |
| `api.getDashboardSummary()` | Composite — calls all 4 in parallel | ✅ Backward compat |

### Orders (`/api/admin/orders/*`) — separate from sample-orders
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getOrders(filters)` | `GET /api/admin/orders` | ✅ Aligned (page, limit, sortBy, sortOrder, status, customer_id, manufacturer_id, startDate, endDate, search) |
| `api.getOrderById(id)` | `GET /api/admin/orders/:id` | ✅ Aligned |
| `api.updateOrderStatus(id, status, trackingNumber?)` | `PATCH /api/admin/orders/:id/status` | ✅ Aligned |

### Sample Orders (`/api/admin/sample-orders/*`) — separate from orders
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getSampleOrders(filters)` | `GET /api/admin/sample-orders` | ✅ Aligned |
| `api.getSampleOrderById(id)` | `GET /api/admin/sample-orders/:id` | ✅ Aligned |
| `api.updateSampleOrderStatus(id, status, adminResponse?)` | `PATCH /api/admin/sample-orders/:id/status` | ✅ Aligned |

### Unified Requests (`/api/admin/requests/*`)
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getRequests(filters)` | `GET /api/admin/requests` | ✅ Aligned (type: inquiry\|quotation\|order\|sample_order) |
| `api.getRequestById(id)` | `GET /api/admin/requests/:id` | ✅ Aligned |
| `api.getRequestHistory(id)` | `GET /api/admin/requests/:id/history` | ✅ Aligned |
| `api.reassignManufacturer(id, mfgId, reason)` | `PATCH /api/admin/requests/:id/reassign` | ✅ Aligned (body: `{ new_manufacturer_id, reason }`) |

### Participants (`/api/admin/participants/*`)
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getParticipants(filters)` | `GET /api/admin/participants` | ✅ Aligned (type mapped: MANUFACTURER→manufacturer, etc.) |
| `api.getParticipantById(id)` | `GET /api/admin/participants/:id` | ✅ Aligned |
| `api.activateParticipant(id)` | `PATCH /api/admin/participants/:id/activate` | ✅ Aligned |
| `api.deactivateParticipant(id, reason)` | `PATCH /api/admin/participants/:id/deactivate` | ✅ Aligned (body: `{ reason }`) |
| `api.getParticipantPerformance(id)` | `GET /api/admin/participants/:id/performance` | ✅ Aligned |

### Ratings (`/api/admin/ratings/*`) — 5 category endpoints
| Frontend Method | Railway Endpoint | Status |
|---|---|---|
| `api.getRatings(category)` | `GET /api/admin/ratings/:category` | ✅ Aligned |
| `api.getAllRatings()` | Composite — fetches all 5 categories | ✅ Convenience method |
| `api.getReviews()` | Alias → `getAllRatings()` | ✅ Backward compat |

### Pagination
- `PaginationMeta` now includes `hasNextPage` and `hasPreviousPage` per Railway's `PaginationMetaDto`

---

## ⚠️ Gaps — Frontend needs but Railway doesn't have

### 1. Admin Users CRUD
- `GET /api/admin/users` — **Not in Railway Swagger**
- `POST /api/admin/users` — **Not in Railway Swagger**
- `PATCH /api/admin/users/:id` — **Not in Railway Swagger**
- `DELETE /api/admin/users/:id` — **Not in Railway Swagger**
- **Frontend impact**: Access Control → Users page (`/access-control/users`) won't work against Railway
- **Current workaround**: Uses local backend at localhost:3001

### 2. Delete Review
- `DELETE /api/admin/reviews/:table/:id` — **Not in Railway Swagger**
- **Frontend impact**: Reviews page is "Coming Soon" so no visible impact
- **api.ts**: Stub throws error with message to contact backend team

### 3. Manufacturer Options
- `GET /api/admin/orders/manufacturer-options` — **Not in Railway Swagger**
- **Frontend impact**: Reassign dialog needs manufacturer list
- **Current workaround**: Falls back to `getParticipants({ type: "MANUFACTURER", limit: 100 })`

### 4. ENDCUSTOMER Participant Type
- Railway's participant type enum only has: `manufacturer | transport_provider | coal_provider | labour_contractor`
- **"endcustomer"** is NOT in the Railway enum
- **Frontend impact**: The Customers subroute (`/participants/customers`) may return empty or error
- **Recommendation**: Ask backend team to add endcustomer/customer support to participants endpoint

---

## 🔄 Key Changes Made

1. **Orders split**: `getOrders()` now hits `/api/admin/orders` (normal) vs `getSampleOrders()` hits `/api/admin/sample-orders`
2. **Dashboard split**: Composite `getDashboardSummary()` calls 4 Railway endpoints in parallel
3. **Participant type mapping**: Frontend uppercase types (MANUFACTURER) → Railway lowercase (manufacturer)
4. **Reassign**: Now uses `/api/admin/requests/:id/reassign` with `{ new_manufacturer_id, reason }`
5. **Deactivate**: Now requires `{ reason }` body — UI updated with textarea
6. **Pagination**: `PaginatedResponse.meta` includes `hasNextPage` / `hasPreviousPage`
7. **Ratings**: 5 separate category endpoints instead of unified `/api/admin/reviews`

---

## 📋 Next Steps

1. **Backend team**: Implement Admin Users CRUD endpoints
2. **Backend team**: Add `endcustomer` to participant type enum (or separate endpoint)
3. **Backend team**: Add delete review endpoint if needed
4. **Frontend**: When Railway auth works → remove demo-token bypass, point `.env.local` to Railway URL
5. **Frontend**: Build full Ratings page using `api.getRatings(category)` per category
