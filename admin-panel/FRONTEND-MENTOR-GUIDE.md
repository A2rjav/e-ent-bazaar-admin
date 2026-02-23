# e-ENT Bazaar Admin Panel — Frontend Mentor Guide

A structured, educational walkthrough of this codebase from beginner to advanced. No code changes — explanation only.

---

## 1. Project Architecture Overview

### What the folder structure is doing

The project lives under `admin-panel/`. The important parts are:

- **`app/`** — All routes and page-level UI. This is Next.js App Router: every folder can become a URL segment, and special files like `layout.tsx` and `page.tsx` define what renders.
- **`components/`** — Reusable UI. Split into `ui/` (generic primitives like Button, Table, Badge), `layout/` (Sidebar, Header), and feature folders (`dashboard/`, `requests/`, `participants/`, `reviews/`).
- **`lib/`** — Shared logic that is not React: API client, types, mock data, utilities (e.g. `cn`, `formatDate`). No components here.
- **`store/`** — Global client state. In this project, a single Zustand store for UI + auth.

So: **routes and shell live in `app/`**, **shared building blocks in `components/`**, **non-UI logic in `lib/`**, **cross-page state in `store/`**.

### Why it is structured this way

- **Colocation by feature** — Request-related components sit under `components/requests/`. When you work on “requests,” you know where to look. Dashboard charts live under `components/dashboard/`. This scales better than one giant `components/` dump.
- **`lib/` as the “backend boundary”** — The API layer (`lib/api.ts`) and types (`lib/types.ts`) sit in one place. When the real NestJS backend exists, you swap implementations in `lib/api.ts`; pages and hooks keep calling `api.getDashboardSummary()` and so on. The rest of the app does not care whether data comes from mocks or HTTP.
- **Single store file** — One Zustand store (`store/ui.store.ts`) keeps auth and sidebar state. The app is not huge, so one store is enough. If you later add request-level or form-level global state, you could add `store/requests.store.ts` or keep using React Query for server state and Zustand only for UI.

### How the App Router works here

Next.js App Router is **file-system based**. The path you see in the browser maps to folders and files:

- `app/page.tsx` → `/` (root).
- `app/login/page.tsx` → `/login`.
- `app/(admin)/dashboard/page.tsx` → `/dashboard`.
- `app/(admin)/requests/page.tsx` → `/requests`.
- `app/(admin)/requests/[id]/page.tsx` → `/requests/abc-123` (dynamic segment).

The `(admin)` part is a **route group**: it does not appear in the URL. So `/dashboard` and `/requests` are siblings in the file tree but both sit under the same `(admin)` group. That group has a single `layout.tsx`, so every route under it (dashboard, requests, participants, reviews, settings) shares the same shell: sidebar + header + main content area. Only the `children` part (the page) changes.

So: **URL = path in `app/`**, **route groups = logical grouping without changing the URL**, **layouts = shared wrapper for a segment of routes**.

### Layouts vs pages

- **`app/layout.tsx`** — Root layout. Wraps the entire app. Here it sets HTML/body, font (Inter), and wraps everything in `QueryProvider`. It runs on every request (and in the client bundle for client navigation). It does not define a “page”; it defines the outer shell and providers.
- **`app/(admin)/layout.tsx`** — Admin shell. Only runs for routes under `(admin)`. It renders Sidebar, Header, and `{children}`. The `children` is the active page component (e.g. `DashboardPage` when you are on `/dashboard`). This layout is a client component (`"use client"`) because it uses `useRouter`, `useEffect`, and Zustand for auth check and sidebar state.
- **`app/(admin)/dashboard/page.tsx`** — The actual dashboard “screen.” It only cares about dashboard content: KPIs, charts, aging table. It does not render sidebar or header; the parent layout does.

So: **Layout = shared wrapper and providers**, **Page = the content for that URL**. Layouts can be nested: Root Layout → Admin Layout → (optional future nested layouts). Each page is the leaf that receives `children` from above; here the page is the main content, and the layout provides the chrome around it.

---

## 2. Data Flow: What Happens When You Open `/dashboard`

### Step-by-step

1. **User navigates to `/dashboard`**  
   Next.js matches the path to `app/(admin)/dashboard/page.tsx` and the two layouts: `app/layout.tsx` then `app/(admin)/layout.tsx`.

2. **Root layout**  
   Renders first. It outputs `<html>`, `<body>`, `QueryProvider`, and `children`. So the whole tree is wrapped in React Query’s `QueryClientProvider`. No data fetch here; just structure and context.

3. **Admin layout**  
   Renders next. It’s a client component. It runs `useEffect` to call `initAuth()` (Zustand) and another `useEffect` that checks `localStorage` for `ent-bazaar-auth` and redirects to `/login` if missing. So before you even see the dashboard, the layout ensures you are “logged in” (token present). Then it renders Sidebar, Header, and `main` with `{children}`.

4. **Dashboard page**  
   Renders inside that `main`. It’s a client component. It runs:
   - `useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboardSummary })`.
   React Query looks in its cache for the key `["dashboard"]`. First time: cache miss → it calls `api.getDashboardSummary()`.

5. **API / mock layer**  
   `api.getDashboardSummary` is implemented in `lib/api.ts`. Right now it does not call a real backend; it imports from `lib/mock-data.ts`, calls `sleep(SIMULATED_DELAY)`, and returns `mockDashboardData`. So the “network” is simulated in memory. The return value is typed as `DashboardData` (from `lib/types.ts`).

6. **React Query**  
   Gets the result, puts it in cache under `["dashboard"]`, and updates the query state: `data`, `isLoading`, `isError`, etc. The component re-renders.

7. **Dashboard UI**  
   On first load you see loading state, so the page renders `PageHeader` + `DashboardSkeleton`. After data arrives, it renders `PageHeader`, `KPISection`, `StatusChart`, `RegionChart`, `AgingTable`, each receiving the right slice of `dashboard` (e.g. `dashboard.summary`, `dashboard.statusCounts`). No component fetches data itself; the page fetches once and passes data down as props.

### Flow in text

```
User
  → navigates to /dashboard
  → Next.js resolves app/layout.tsx → app/(admin)/layout.tsx → app/(admin)/dashboard/page.tsx

Layout (admin)
  → useEffect: initAuth() (Zustand)
  → useEffect: if no token in localStorage → redirect to /login
  → render: Sidebar + Header + <main>{children}</main>

Page (DashboardPage)
  → useQuery({ queryKey: ["dashboard"], queryFn: api.getDashboardSummary })
  → React Query: cache miss → runs queryFn

API layer (lib/api.ts)
  → getDashboardSummary() → sleep(400) → return mockDashboardData
  → returns Promise<DashboardData>

React Query
  → resolves promise, stores result in cache under ["dashboard"]
  → re-renders DashboardPage with data / isLoading: false

UI
  → PageHeader + KPISection(summary) + StatusChart(statusCounts) + RegionChart(regionDemand) + AgingTable(agingRequests)
```

So: **User → Route → Layout (auth check) → Page → useQuery → API (mock) → Cache → UI.**

### How the mock API is “connected”

There is no separate mock server. The “API” is a single object in `lib/api.ts` whose methods return Promises. Those methods use in-memory data from `lib/mock-data.ts` and `sleep()` to mimic latency. Every component that needs data calls `api.something()`. So the “connection” is: **same module, same types, same function signatures**. When you add a real backend, you keep the same `api` interface and types, and replace the body of each method with `fetch()` or axios. The rest of the app (pages, components) does not need to change; only `lib/api.ts` (and possibly env for base URL) changes.

---

## 3. React Query Deep Explanation

### What is queryKey?

`queryKey` is an array that **uniquely identifies** a query in React Query’s cache. In this app you see:

- `["dashboard"]` — one key for the whole dashboard.
- `["requests", status, region, search, page]` — key for the requests list; when status, region, search, or page change, the array changes, so React Query treats it as a different query and fetches again.
- `["request", id]` — key for a single request; each `id` has its own cache entry.
- `["participants", activeTab, search, page]` — same idea for participants.
- `["reviews"]` — one key for the reviews list.

Rule of thumb: **everything that affects the result of the fetch should be part of the key**. So filters, ids, pagination — all go in the key. That way: same key → reuse cache; different key → new request (or background refetch depending on options).

### What is caching?

React Query keeps a **client-side cache** of query results. When you call `useQuery` with a given `queryKey`:

- If that key already has data and is not stale, React Query returns the cached data and does not call the server (or in our case, the mock) again.
- If the key has no data or is stale, it runs `queryFn`, gets the result, stores it under that key, and returns it.

So visiting `/dashboard` twice in a short time: the second time the cache might still be fresh (see `staleTime` below), so you see the previous data immediately and no loading state. That’s caching.

### What triggers a refetch?

In this project, `QueryProvider` sets:

- `staleTime: 60 * 1000` (1 minute) — data is considered fresh for 1 minute; during that time React Query will not refetch just because the component remounts or the window refocuses.
- `refetchOnWindowFocus: false` — switching tabs and coming back does not refetch.
- `retry: 1` — on failure, one retry.

So refetches happen when:

1. **The queryKey changes** — e.g. you change status filter or page on the requests list. New key → new query → fetch.
2. **The component mounts and the data is stale** — e.g. you left the dashboard open for more than 1 minute, then navigated away and back; on remount the data may be stale, so React Query refetches.
3. **You call refetch()** — e.g. the dashboard page passes `refetch` to `ErrorState`; when the user clicks “Retry,” refetch runs.

There is no automatic refetch on window focus here; that’s a deliberate choice to avoid extra requests in an admin panel where you might have many tabs open.

### Why not use useEffect?

You could do:

- In the page: `useEffect` that calls `api.getDashboardSummary()`, stores result in `useState`, and sets loading/error in state.
- You’d have to handle: loading flag, error flag, retry, and caching (e.g. “don’t refetch if we already have data”) yourself.

React Query gives you:

- **Caching** — same key → no duplicate request; shared across components.
- **Deduplication** — two components using the same query key trigger one request.
- **Stale-while-revalidate** — show cached data, refetch in background, update when new data arrives.
- **Loading and error state** — `isLoading`, `isError`, `refetch` out of the box.
- **Consistent patterns** — every list/detail screen uses the same mental model.

So the “why not useEffect?” answer: you can, but then you reimplement a lot of what React Query already does. Here, the codebase consistently uses React Query for server-like data (dashboard, requests, participants, reviews), so behavior is predictable and future backend integration is a drop-in in `lib/api.ts`.

### How background refresh works

When `staleTime` has passed, the data is “stale.” On the next time that query is used (e.g. you navigate back to the dashboard), React Query can:

- Return the cached (stale) data immediately so the UI is not blank.
- In the background, run `queryFn` again.
- When the new data arrives, update the cache and re-render with fresh data.

So the user sees old data first (instant), then the UI updates if the response changed. That’s “stale-while-revalidate.” In this app it’s less visible because refetch on window focus is off and many navigations will use different query keys (e.g. different pages), but the mechanism is there: after 1 minute, the next use of `["dashboard"]` will get cache first, then a background refetch.

---

## 4. TypeScript Types

### Why types are defined in types.ts

All shared domain and API types live in `lib/types.ts`: `RequestStatus`, `AdminUser`, `DashboardData`, `RequestListItem`, `RequestDetail`, `Participant`, `Review`, `PaginatedResponse`, etc. The rest of the app imports from there.

Reasons:

- **Single source of truth** — Request statuses, participant types, and shape of dashboard/request/participant/review are defined once. Components and the API layer both use the same types.
- **Contract with the backend** — When the real API exists, the backend and frontend must agree on payload shapes. Keeping types in one file makes it obvious what that contract is; you can later generate types from OpenAPI or keep them hand-synced.
- **Discoverability** — New developers (or you in six months) look in one place to see what a “Request” or “DashboardData” looks like.

So: **types.ts = shared vocabulary and API contract.**

### How types protect you

- **Compile-time checks** — If you pass `dashboard.summary` to a component that expects `RequestListItem[]`, TypeScript errors. You catch misuse at build time, not when a field is undefined at runtime.
- **Autocomplete and refactors** — IDE suggests `status`, `requestNumber`, etc. Renaming a field in types and fixing usages is safe.
- **API contract** — `api.getRequests` returns `Promise<PaginatedResponse<RequestListItem>>`. So the caller knows it gets `{ data, meta }` and that each item has `id`, `requestNumber`, `status`, etc. If someone changes the mock to return a different shape, TypeScript will complain wherever the code assumes the original shape.

So types protect you from shape mismatches and wrong assumptions across the app.

### What happens if types don’t match the backend

If the backend starts returning a different shape (e.g. a new required field, or a field renamed from `requestNumber` to `request_number`):

- **If you don’t update types** — TypeScript still thinks the old shape is correct. You might get runtime errors (e.g. `undefined` when you access a property) or wrong UI. So: when the API contract changes, you must update `lib/types.ts` (and possibly `lib/api.ts` and components that use the new/renamed fields).
- **If you update types** — You change types to match the backend. TypeScript will then error everywhere the code still uses the old shape. You fix those call sites. So types act as a “change detector” when the contract evolves.

Best practice: treat types as the contract. When integrating the real API, start from the backend’s response and align `lib/types.ts` (and API layer) to it; then fix any component that assumed the mock shape.

### How to design good types

Patterns used in this codebase that are worth keeping:

- **Union types for closed sets** — `RequestStatus`, `ParticipantType`, `AdminRole`. The UI and API only use those values; no random strings.
- **Interfaces for payloads** — `RequestListItem`, `RequestDetail`, `DashboardData`. Clear names that match the domain (“request list item” vs “full request detail”).
- **Generic for reusable structures** — `PaginatedResponse<T>` so every paginated list is `{ data: T[]; meta: { total, page, limit, totalPages } }`. One definition, many lists.
- **Optional for truly optional fields** — e.g. `quotedPrice: number | null` on request; `reason?: string` on status history. Required vs optional is explicit.

When adding new features: add the type first in `lib/types.ts`, then implement the API and components. That keeps the contract clear and avoids “figure out the shape from the mock” later.

---

## 5. State Management (Zustand)

### Why Zustand was used

The app needs a small amount of **global client state**: is the user logged in, who is the current user, is the sidebar collapsed. This state is needed in:

- **Admin layout** — to show/hide sidebar, redirect if not authenticated, show user in header.
- **Login page** — to call `login(user)` after successful auth.
- **Header / Sidebar** — to read `currentUser`, `sidebarCollapsed`, and call `logout`, `toggleSidebarCollapsed`.

That state is not server state (it’s not fetched from the API in the same way as dashboard data); it’s derived from login and stored in memory (and partially mirrored in localStorage). Zustand is a small library that gives a store with selectors and actions, no Provider needed, and works well with React’s model. So Zustand was chosen for this slice of global UI + auth state.

### When to use local state vs global state (Zustand)

- **Local state (useState in the component)** — Used for things that only that component (or its immediate children) care about. In this app: filter values on the requests page (`status`, `region`, `search`, `page`), form fields on login (`email`, `password`, `error`, `isLoading`), open/closed state of a dialog. No other screen needs to know the current request filter or the login form value; when you leave the page, that state can be discarded.
- **Global state (Zustand)** — Used for state that multiple unrelated parts of the tree need. Here: “is the user logged in?” and “who is the current user?” (layout + header + login), and “is the sidebar collapsed?” (sidebar + layout). If you kept that in local state, you’d have to pass it down through many layers or use context; one store is simpler.

Rule of thumb: if only one page or one subtree cares, keep it local. If layout and multiple pages need it, put it in a store (or in a context if you prefer).

### What problem it solves

Without a store you’d either:

- **Prop drilling** — Pass `user`, `setUser`, `sidebarCollapsed`, `setSidebarCollapsed` from root down through layout → header/sidebar. Messy and brittle.
- **Context** — Create AuthContext and UIContext. You’d need to wrap the tree and possibly split contexts to avoid unnecessary re-renders. Zustand gives you a store; any component that calls `useUIStore((s) => s.currentUser)` re-renders only when that slice changes. So you get “global state” without wiring providers and without every layout child re-rendering on every store update.

So: **Zustand solves “a few pieces of global state needed in multiple places” without prop drilling and with fine-grained subscriptions.**

### Alternatives

- **React Context** — Good for dependency injection (theme, locale) or when the value changes rarely. For frequently updated state, every consumer re-renders unless you split context or memoize. Here, the store is small and updates are rare (login, logout, sidebar toggle), so either would work; Zustand is just a simple, flat store.
- **Redux** — More structure and tooling; good for very large apps. For “auth + sidebar,” it’s usually overkill; Zustand is enough.
- **Jotai / Recoil** — Atom-based; you get small pieces of state and compose them. Also valid; Zustand was chosen for simplicity and a single store file.

So the choice here is “lightweight global state,” and Zustand fits that. If the app grows and you need more global state (e.g. selected request ids, bulk actions), you can add more slices to the same store or a second store; the pattern stays the same.

---

## 6. Component Design

### Why reusable components matter

If every page builds its own tables, buttons, and cards with raw `<table>`, `<button>`, and inline Tailwind, you get:

- **Inconsistency** — Different padding, colors, and behavior on different screens.
- **Duplication** — Same loading skeleton, same empty state, repeated in many files.
- **Harder changes** — Updating “all primary buttons” or “all tables” means touching many files.

This codebase avoids that by having:

- **`components/ui/`** — Primitives: Button, Input, Card, Table, Badge, Dialog, Select, Pagination, LoadingSkeleton, ErrorState, EmptyState, PageHeader, StatusBadge, etc. They don’t know about “requests” or “dashboard”; they just render a button, a table, or a message.
- **Feature components** — e.g. `RequestTable`, `RequestFilters`, `KPISection`, `StatusChart`. They use the UI primitives and know the domain (requests, dashboard). They receive data as props and render it.

So: **UI components = reusable building blocks**, **feature components = composition of those blocks for one feature.** Reuse is in the primitives; consistency comes from using the same primitives everywhere.

### Why StatusBadge and Table exist

- **RequestStatusBadge / OnboardingStatusBadge** — Status is shown in many places (request list, request detail, maybe participants). If each place did its own “if PENDING then yellow badge, if DELIVERED then green badge,” you’d repeat the mapping and the styling. The badge components centralize: “given this status enum, show this label and this variant.” Adding a new status or changing colors happens in one file. The types (`RequestStatus`, `OnboardingStatus`) already restrict the allowed values, so the badge config is a single record keyed by that type.
- **Table (and TableHeader, TableBody, TableRow, TableCell, etc.)** — Tables appear on requests, participants, reviews, and dashboard aging. The base Table provides structure and styling (borders, padding, hover). Each feature then composes: `RequestTable` uses `Table` + `RequestStatusBadge` + `formatDate` and maps over `RequestListItem[]`. So the look and behavior of “a table” are defined once; each screen only cares about columns and row content.

So: **StatusBadge = single place for status → visual mapping**, **Table = single place for table layout and style.** New tables (e.g. for audits) just compose Table + custom cells.

### How to think when designing scalable UI components

- **Props = the minimum needed** — e.g. `RequestTable` only takes `data: RequestListItem[]`. It doesn’t take “fetch function” or “filters”; the parent fetches and filters and passes the slice. So the component is “dumb”: given data, render. That makes it easy to test and reuse (e.g. in a story or another page).
- **Composition over configuration** — Prefer `<Card><CardHeader>...</CardHeader><CardContent>...</CardContent></Card>` over `<Card title="..." subtitle="..." />` with a huge props list. So the Table is Table + TableHeader + TableRow + TableCell; you compose. That keeps each primitive simple and flexible.
- **Domain in feature components, not in UI** — `components/ui/status-badge.tsx` knows about `RequestStatus` and `OnboardingStatus` because it’s the one place that maps enum → label/variant. So “status” is still a domain concept, but the only domain knowledge in UI is in that badge. The rest of `ui/` is generic.
- **One responsibility** — PageHeader just shows title + description. ErrorState just shows message + retry. AgingTable just shows the aging requests array. When you need a new screen, you compose these; you rarely need to change them.

So: **small, composable primitives + feature components that only know “what to show” and “what data shape”** keeps the UI scalable.

---

## 7. Professional Best Practices: What’s Good, What’s Overkill, What to Improve

### What is good in this architecture

- **Clear separation** — Routes in `app/`, API + types in `lib/`, UI primitives in `components/ui/`, feature UI in `components/{feature}`. Easy to find things and to know where new code belongs.
- **Single API layer** — All data access through `lib/api.ts` with shared types. Swapping mock for real backend is a local change.
- **React Query for server-like data** — Consistent pattern for loading/error/refetch and cache keys. No ad-hoc useEffect fetching.
- **Zustand for a small, clear slice** — Auth and sidebar only; not overused.
- **TypeScript used meaningfully** — Domain types in one place; pagination and filters typed; components receive typed props.
- **Route groups and layouts** — `(admin)` groups all admin routes and gives them one layout (sidebar + header). Clean URLs and no layout duplication.
- **Reusable UI and feature components** — Tables, badges, cards, and feature-level pieces (RequestTable, KPISection) are composed consistently.

### What is overkill (or could be simpler)

- **No real backend yet** — The mock in `lib/api.ts` is appropriate for the current phase. Nothing here is overkill; the structure is ready for a real API.
- **Single Zustand store** — For this size, one store is fine. Not overkill.
- **React Query defaults** — `staleTime: 60_000` and `refetchOnWindowFocus: false` are conservative. Some teams might use shorter staleTime or enable refetch on focus; for an admin panel, current choices are reasonable. Not overkill.

So by “overkill” we really mean: there isn’t much. The only thing you might call “extra” is the level of component splitting (e.g. separate KPI cards in a grid vs one big component); that’s already on the “good” side for maintainability.

### What can be improved

- **Auth check in layout** — Right now the layout reads `localStorage` and redirects if no token; it also calls `initAuth()` which sets `currentUser` from a fixed mock user. So “auth” is token-in-localStorage plus hardcoded user. When the backend exists: validate the token (e.g. call `api.getCurrentUser()`), and redirect if 401. That keeps auth server-authoritative.
- **Login page and store** — Login currently doesn’t use React Query. You could have a `useMutation` for login that on success invalidates a “currentUser” query or updates the store. Same for logout (clear token, clear store, invalidate queries if needed). Small improvement for consistency.
- **Error boundary** — There’s no React error boundary in the tree. If a component throws (e.g. bad data shape), the whole app can white-screen. A boundary at layout level would catch that and show a fallback UI + retry.
- **Request list and cache invalidation** — After “reassign manufacturer” on the request detail page, the requests list cache is not invalidated. So the list might still show the old manufacturer until you refetch or navigate. Calling `queryClient.invalidateQueries({ queryKey: ["requests"] })` (and optionally `["request", id]`) after a successful reassign would keep the UI in sync.
- **Pagination and queryKey** — Requests and participants put `page` in the queryKey, which is correct. One nuance: if the user goes from page 1 to page 2, then changes a filter, you reset to page 1 in state; that’s already done in the handlers. Good. You could also use `keepPreviousData` (or the newer `placeholderData: keepPreviousData`) so when changing page the previous page’s data stays visible until the next page loads; that’s a UX polish.

### What a senior would refactor later

- **Extract custom hooks for list pages** — The requests page has `useState` for filters + `useQuery` with a key that includes those filters. The same pattern appears on participants (tabs + search + page). A hook like `useRequestList(filters)` or `usePaginatedRequests(status, region, search, page)` could return `{ data, isLoading, isError, refetch, setPage, setStatus, ... }`. That would shorten the page and make the “filtered list” pattern reusable (e.g. for audits later).
- **Centralize query keys** — Define constants or a small helper, e.g. `queryKeys.dashboard()`, `queryKeys.requests(filters)`, `queryKeys.request(id)`. So when you invalidate or prefetch, you don’t rely on string literals scattered in components. Reduces typos and keeps keys consistent.
- **Form handling on login** — Login uses controlled inputs and manual `useState`. For larger forms, something like React Hook Form + Zod would give validation and less boilerplate. For a two-field login form, current approach is acceptable; a senior might still introduce it for consistency with future forms (e.g. settings, CMS).
- **Accessibility** — Tables, dialogs, and filters could be audited for focus management, ARIA labels, and keyboard navigation. The Radix-based UI components help, but custom pieces (e.g. RequestFilters, ReassignDialog) should be checked.
- **Testing** — No tests in the snapshot we have. A senior would add: unit tests for utils and for the request state machine (when it exists); integration or component tests for critical flows (login → dashboard, request list → detail, reassign). React Query and MSW would be used to mock the API in tests.

---

## Summary Table

| Topic | Key idea in this codebase |
|-------|---------------------------|
| **Architecture** | App Router with route groups; `app/` = routes, `lib/` = API + types, `components/` = UI and features, `store/` = global client state. |
| **Data flow** | User → route → layout (auth) → page → useQuery → api (mock) → cache → UI. Data flows down via props from page to feature components. |
| **React Query** | queryKey = identity of the query (including filters/page); cache avoids duplicate requests; refetch when key changes or when refetch() is called; staleTime 1 min, no refetch on focus. |
| **Types** | Single place (`lib/types.ts`) as contract; protects at compile time and when backend contract changes. |
| **Zustand** | Global UI + auth (sidebar, currentUser, isAuthenticated); local state for page-local UI (filters, form fields). |
| **Components** | UI primitives in `ui/`; feature components compose them and receive typed data; StatusBadge and Table centralize repeated patterns. |
| **Next steps** | Auth backed by real API; query key factory; optional list hooks and error boundary; cache invalidation after mutations; tests and a11y pass. |

This should give you a clear path from “what does this folder do?” to “how does data get to the screen?” to “how do I extend this like a senior would?” Use this doc as a map; when you touch a file, you can relate it back to these sections.
