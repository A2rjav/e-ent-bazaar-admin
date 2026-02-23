# RBAC Frontend — How It Will Look

This document describes how Role-Based Access Control (RBAC) is reflected in the admin panel UI, aligned with the backend roles and permissions in the architecture.

---

## 1. Role summary (Day 1)

| Role | Sidebar visibility | Purpose |
|------|--------------------|--------|
| **Super Admin** | Dashboard, Requests, Participants, Reviews, (Settings), future: CMS, Admin users, Audit logs | Full access; manage admins and audit. |
| **Operations Manager** | Dashboard, Requests, Participants, Reviews | Day-to-day ops: requests, participants, analytics, reassign, disable, remove reviews. |
| **Content Team** | Reviews, future: CMS only | Content only; no requests or participant data. |

---

## 2. Sidebar (navigation)

- **Filtered by role:** Only menu items the role is allowed to see are shown.
- **Super Admin:** Sees all sections (including future “Admin users” and “Audit logs”).
- **Operations Manager:** Sees Dashboard, Requests, Participants, Reviews. No CMS, no Admin users, no Audit logs.
- **Content Team:** Sees only Reviews and (when built) CMS. No Dashboard, Requests, or Participants.
- **Profile widget:** Same for all roles (name + role label + “Profile settings” + “Log out”). Role label comes from `currentUser.role` (e.g. “Super Admin”, “Ops Manager”, “Content Team”).

So “how the frontend will look” for navigation: **each role sees a different set of sidebar items**, with no extra visual clutter for things they can’t access.

---

## 3. Pages and routes

- **Shared layout:** All authenticated roles use the same `(admin)` layout (sidebar + main area). The sidebar content is what changes.
- **Default redirect after login:**  
  - Super Admin / Operations Manager → `/dashboard`.  
  - Content Team → `/reviews` (or future `/cms`) so they don’t land on a page they’re not allowed to use.
- **Access to a URL the role can’t use:**  
  - If someone bookmarks or types e.g. `/dashboard` as Content Team, the app shows a **403 “Access denied”** page (or redirects to a safe page like `/reviews`). So the “frontend look” for no-permission is a clear “Access denied” state, not a broken or empty page.

---

## 4. Gated actions (buttons and controls)

- **Reassign manufacturer (Requests):** Shown only if the user has permission to reassign (e.g. Super Admin, Operations Manager). Content Team never sees this.
- **Disable participant:** Same idea — only roles with `participants.disable` see the control.
- **Delete / remove review:** Only roles with `ratings.delete` (Super Admin, Operations Manager) see the action.
- **CMS create/edit/delete:** Only Content Team and Super Admin see these when the CMS module exists.

So the frontend **look** is: action buttons and controls appear only when the current user’s role has the right permission; otherwise those controls are hidden (or disabled with a tooltip like “You don’t have permission”).

---

## 5. Admin-only areas (Super Admin)

- **Admin users:** Page to list/create/edit admin users and assign roles. Only in sidebar and reachable for **Super Admin**.
- **Audit logs:** Page to search and view audit trail. Only in sidebar and reachable for **Super Admin**.

So for non–Super Admins, the frontend **does not show** these menu entries or pages at all; for Super Admin, they appear like any other section.

---

## 6. 403 / Access denied

- **Look:** A simple page (e.g. under `app/(admin)/access-denied/page.tsx`) with:
  - Title: “Access denied” (or “You don’t have permission to view this page”).
  - Short message that their role doesn’t have access.
  - Button: “Go to dashboard” or “Go to reviews” (role-appropriate default).
- **When:** Shown when the user hits a route they’re not allowed to (e.g. Content Team on `/participants` or `/dashboard` if we restrict it). Can be implemented in layout or a small route guard that checks permission for the current path.

---

## 7. Summary: “How will the frontend look?”

- **Sidebar:** Different per role (fewer items for Content Team, full set for Super Admin).
- **Pages:** Same layout and structure; some routes redirect or show 403 for certain roles.
- **Buttons/actions:** Some visible only when the user has the right permission (reassign, disable participant, delete review, CMS actions).
- **Profile:** Same for everyone; role name shown so the user knows their context.
- **Admin-only:** “Admin users” and “Audit logs” only visible and accessible to Super Admin.

Implementation uses `currentUser.role` from the auth store and a small permission helper (e.g. `can(role, permission)`) so components can decide what to show or hide without duplicating role logic.

---

## 8. Testing different roles (mock)

To see how each role’s sidebar looks, change the mock user’s role in `lib/mock-data.ts`:

- `role: "super_admin"` → full sidebar (Dashboard, Requests, Participants, Reviews).
- `role: "operation_manager"` → same as above.
- `role: "content_team"` → only **Reviews** in the sidebar.

After changing, log in again (or refresh if already logged in) to see the filtered nav.
