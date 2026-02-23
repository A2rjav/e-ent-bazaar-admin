# Participants module — API readiness

**Short answer: Yes, we're ready to start the API part of the participants module.** The frontend is aligned with the real DB and the contracts are defined. Below is what the document (PRD/architecture) expects, what we have, and what the backend should implement.

---

## 1. What the PRD / architecture expects (participants)

From **e-ENT-Bazaar-Project-Plan.md** and **e-ENT-Bazaar-Architecture.md**:

- **Five participant types:** Manufacturers, Buyers (endcustomers), Coal Providers, Transport Providers, Labour Contractors.
- **List:** Browse and search participants by type, region (state/district/city), and status.
- **Actions:** Verify new participants; disable (and re-enable) participants; full audit when disabling.
- **Detail view:** View a single participant (and later: performance metrics).

The **real database** (Neon) has **separate tables** per type: `manufacturers`, `endcustomers`, `coal_providers`, `transport_providers`, `labour_contractors` — not a single unified table. The API can expose either one endpoint per table or a unified `GET /participants?type=...` that returns the correct shape per type.

---

## 2. What we already have (frontend + contracts)

### 2.1 Database alignment (api-contracts.ts)

- **ManufacturerRow** — maps to `manufacturers` (all columns, camelCase from snake_case).
- **EndcustomerRow** — maps to `endcustomers` (Buyers).
- **CoalProviderRow** — maps to `coal_providers`.
- **TransportProviderRow** — maps to `transport_providers`.
- **LabourContractorRow** — maps to `labour_contractors`.

So the **column names and types** the backend will read/write are already defined and match the DB.

### 2.2 Frontend types (lib/types.ts)

- **ParticipantType:** `MANUFACTURER` | `ENDCUSTOMER` | `COAL_PROVIDER` | `TRANSPORT_PROVIDER` | `LABOUR_CONTRACTOR`.
- **Participant:** Unified list row (`id`, `type`, `name`, `email`, `phone`, `companyName`, `state`, `district`, `city`, `category`, `createdAt`). This is what the list UI uses; the backend can build it from any of the five Row types.
- **ParticipantFilters:** `type`, `search?`, `page?`, `limit?`.

### 2.3 Current mock API (lib/api.ts)

- **getParticipants(filters)** — returns `PaginatedResponse<Participant>`. Supports `type`, `search`, `page`, `limit`. Ready to be replaced by a real GET.
- **toggleParticipant(participantId, isActive)** — used for enable/disable. Ready to be replaced by PATCH activate/deactivate.

### 2.4 Endpoint registry (api-contracts.ts)

Two possible styles; both are valid:

**Option A — Unified participants (current frontend expectation):**

- `GET /api/admin/participants?type=manufacturer|endcustomer|coal_provider|transport_provider|labour_contractor&search=&page=1&limit=10`  
  → `PaginatedResponse<Participant>` (or the corresponding Row type for that `type`).
- `GET /api/admin/participants/:id` → Participant detail (one of the Row types + `type`).
- `PATCH /api/admin/participants/:id/activate`  
- `PATCH /api/admin/participants/:id/deactivate`  
  (Where “active” is interpreted per table: e.g. `manufacturers.status`, `endcustomers.deleted_at`, etc.)

**Option B — One resource per table (also in registry):**

- `GET /api/admin/manufacturers` (+ query params) → `PaginatedResponse<ManufacturerRow>`
- `GET /api/admin/manufacturers/:id` → `ManufacturerRow`
- Same for `endcustomers`, `coal-providers`, `transport-providers`, `labour-contractors`.
- Activate/deactivate per resource: e.g. `PATCH /api/admin/manufacturers/:id/activate`.

The frontend currently calls **one** method: `getParticipants({ type, search, page, limit })`. So the backend can either:

- Implement **Option A** and the frontend keeps a single `GET /api/admin/participants?type=...`, or  
- Implement **Option B** and the frontend switches to five endpoints (e.g. `getManufacturers`, `getEndcustomers`, …) and we change `api.getParticipants` to call the right one by `type`. Both are “ready” from a contract perspective.

---

## 3. What the backend should implement (minimal for “start API”)

To **start** the API part of the participants module according to the document:

1. **List (required)**  
   - **Either:**  
     - `GET /api/admin/participants?type=...&search=&page=&limit=`  
       → Paginated list of participants for that type (response shape = list of objects that match or can be mapped to **Participant**).  
   - **Or:**  
     - Five GETs: `/manufacturers`, `/endcustomers`, `/coal-providers`, `/transport-providers`, `/labour-contractors` with pagination and search, each returning the corresponding **Row** type.  
   - Filters: at least `type` (or resource path), `search` (name/company/email/phone), `page`, `limit`. Optional: `state`, `city` if you want “region” as in the PRD.

2. **Activate / Deactivate (required by PRD)**  
   - `PATCH /api/admin/participants/:id/activate` and `PATCH .../deactivate`  
   - Or per-resource: e.g. `PATCH /api/admin/manufacturers/:id/activate` (and same for others).  
   - Backend maps `id` to the correct table (e.g. by prefix or by a shared `participant_id` if you introduce one).  
   - **Audit:** Log who disabled/enabled and when (as per architecture).

3. **Detail (optional for first slice)**  
   - `GET /api/admin/participants/:id` → full row for that participant (one of the five Row types).  
   - Can be added when the frontend gets a participant detail page; the list page does not require it yet.

4. **Verify / Feature (manufacturers only, optional)**  
   - Registry also has `PUT /api/admin/manufacturers/:id/verify` and `.../feature`.  
   - Can come in a later iteration if the PRD calls for “verify new participants” and “featured” flags.

---

## 4. Request/response shapes (reference)

- **List request:**  
  - Query: `type`, `search`, `page`, `limit` (and optionally `state`, `city`).  
- **List response:**  
  - `{ data: Participant[], meta: { total, page, limit, totalPages } }`  
  - Each `Participant` must have: `id`, `type`, `name`, `email`, `phone`, `companyName`, `state`, `district`, `city`, `category`, `createdAt`. Backend can map from any of the five Row types to this shape.

- **Activate/Deactivate:**  
  - No body (or `{}`).  
  - Response: e.g. `{ success: true }` or the updated participant row.

- **Pagination:**  
  - Same as rest of admin API: `page` (1-based), `limit` (e.g. 10), response `meta.total`, `meta.totalPages`.

---

## 5. Summary

- **Contracts and DB alignment:** Done (all five participant tables and their columns are in `api-contracts.ts`).
- **Frontend:** Uses `Participant`, `ParticipantFilters`, `getParticipants`, `toggleParticipant` — ready to point to real endpoints.
- **Backend work to “start” participants API:**  
  - Implement list (unified or per-type) with search + pagination.  
  - Implement activate/deactivate (and audit).  
  - Optionally add detail and verify/feature later.

So **yes, we're ready to start the API part of the participants module** as per the EENTBAZAAR document; the above is the exact scope and shapes to implement first.
