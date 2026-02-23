# e-ENT Bazaar — Admin Panel: Project Plan

**Prepared by:** Aadi
**Date:** February 8, 2026
**Status:** For Review

---

## What Are We Building?

We are building the internal Admin Panel for the e-ENT Bazaar platform — a construction-material marketplace that connects buyers with manufacturers, transport providers, coal providers, and labour contractors.

The Admin Panel is the control centre for our operations team. It gives them visibility into everything happening on the platform — requests, participants, reviews, and overall health metrics — and lets them act when things need intervention.

This is not a simple data viewer. It is an operational workflow tool where actions have real consequences — reassigning a request, disabling a participant, or removing a review all affect live users on the platform.

---

## Who Will Use This?

The panel is strictly for internal team members. There are three roles from day one:

- **Super Admin** — Full control over the platform. Can manage other admin accounts, view audit trails, and access every feature.
- **Operations Manager** — Handles the day-to-day. Monitors requests, manages participants, reviews analytics, and steps in when a request needs reassignment or a participant needs to be disabled.
- **Content Team** — Manages platform content (banners, pages, announcements). They will not have access to requests or participant data.

The system is designed so that new roles can be introduced later without reworking the foundation. Each role only sees and does what they are supposed to — nothing more.

---

## What Does the Admin Panel Need to Do?

### 1. Secure Login and Access Control

Every admin logs in with their email and password. The system verifies who they are and what they are allowed to do. Sessions expire after a reasonable period, and every login is recorded.

No one can access the panel without proper credentials, and no one can perform actions outside their role.

### 2. Request Management

Requests are the core of the platform. A buyer submits a request for materials, and that request moves through a defined lifecycle:

**Pending → Approved → Quoted → Shipped → Delivered**

Requests can also be Cancelled (by the buyer) or Rejected (by the manufacturer) at certain stages.

The admin panel gives the operations team a clear view of every request, where it stands, and its full history. Admins cannot push a request forward or backward through its lifecycle — that is handled by the buyers and manufacturers themselves. But admins *can* step in to:

- **Reassign** a request to a different manufacturer if the current one is unresponsive.
- **View the complete timeline** of every status change with who triggered it and when.

Every reassignment and every status change is recorded permanently.

### 3. Participant Management

The platform has five types of participants: Manufacturers, Coal Providers, Transport Providers, Labour Contractors, and Buyers. A single person can wear multiple hats (e.g., someone could be both a manufacturer and a transport provider).

From the admin panel, the team can:

- Browse and search participants by type, region, or status.
- Verify new participants.
- Disable participants who violate platform policies.

Disabling a participant is a significant action, so it is logged with full context.

### 4. Ratings and Reviews

Buyers and participants leave reviews for each other after a request is completed. The operations team needs the ability to remove reviews that are abusive, fraudulent, or violate guidelines.

Removed reviews are not permanently deleted — they are hidden and the removal is logged, so there is always a record of what was removed and by whom.

### 5. Dashboard and Analytics

The first version of the dashboard will focus on five key metrics that the operations team needs daily:

| Metric | What It Tells Us |
|---|---|
| **Requests by status** | How many requests are Pending, Approved, Shipped, etc. — a snapshot of platform activity. |
| **Request aging** | How long requests have been stuck in Pending. Helps identify bottlenecks and unresponsive manufacturers. |
| **Manufacturer response rate** | What percentage of requests each manufacturer actually responds to. Flags inactive or unreliable partners. |
| **Completion rate** | Of the requests that were approved, how many actually reached delivery. Measures follow-through. |
| **Region-wise demand** | Which regions are generating the most requests. Helps with supply planning and expansion decisions. |

These metrics will be computed directly from live data. As the platform grows, we will introduce caching and background computation to keep the dashboard fast.

### 6. Audit Trail

Every meaningful action in the admin panel is logged:

- Admin logins
- Request reassignments
- Participant verifications and disabling
- Review removals
- Content changes

The audit log captures *who* did *what*, *when*, and *what changed*. Super Admins can browse and search the full audit trail. This is essential for accountability, compliance, and debugging operational issues.

---

## How I Plan to Build This

I am breaking the work into clear phases. Each phase has a defined goal, and I will not move to the next phase until the current one is stable and reviewed.

### Phase 1 — Foundation (Week 1–2)

**Goal:** A working login system with role-based access and audit logging.

- Set up both projects (frontend and backend) with proper tooling and code quality checks.
- Set up the database with tables for admin users, roles, and permissions.
- Build the login flow — email/password authentication with secure session management.
- Implement role-based access control so that each API endpoint knows which roles can call it.
- Set up audit logging so that every admin login is captured from day one.
- Build the login screen on the frontend and connect it to the backend.

**What you can review after this phase:**
An admin can log in, and the system correctly restricts access based on their role. Audit logs are being captured.

---

### Phase 2 — Core Business Logic (Week 3–4)

**Goal:** All core data models and business workflows are operational.

- Expand the database to cover participants, requests, request history, and reviews.
- Build the participant management module — listing, searching, verifying, disabling.
- Build the request management module — listing with filters, viewing full request history.
- Implement the request lifecycle engine that validates status transitions and records every change.
- Build the reassignment capability so admins can move a request to a different manufacturer.
- Build the review management module — listing and soft-removal.

**What you can review after this phase:**
All core operations work end-to-end through the API. You can manage participants, view and reassign requests, and moderate reviews.

---

### Phase 3 — Dashboard (Week 5)

**Goal:** A functional analytics dashboard with all five priority metrics.

- Build the backend calculations for each metric (requests by status, aging, response rate, completion rate, region demand).
- Create the dashboard API endpoints.
- Build the dashboard UI with summary cards, charts, and data tables.

**What you can review after this phase:**
The dashboard displays real, live numbers. The operations team can start using it to monitor platform health.

---

### Phase 4 — Full Admin Panel UI (Week 5–6)

**Goal:** A complete, polished frontend for every module.

- Build the overall layout — sidebar navigation, header, and role-based menu visibility.
- Build the participant management screens (table, filters, detail view, enable/disable controls).
- Build the request management screens (table, status indicators, filter panel, detail view with timeline, reassignment dialog).
- Build the review management screen.
- Build the audit log viewer (Super Admin only).
- Build the admin user management screen (Super Admin only).

**What you can review after this phase:**
The full admin panel is usable. Every module has a working interface connected to the backend.

---

### Phase 5 — Hardening and Production Readiness (Week 7)

**Goal:** The system is secure, stable, and ready for real users.

- Add thorough input validation on both frontend and backend.
- Implement rate limiting to prevent abuse.
- Add security headers and tighten access policies.
- Ensure all list views support pagination for large datasets.
- Set up structured logging so issues can be traced quickly.
- Write automated tests for critical workflows (login, state transitions, access control).
- Set up the deployment pipeline for staging and production environments.

**What you can review after this phase:**
The system is production-ready. It handles errors gracefully, validates all inputs, and is protected against common security threats.

---

### Phase 6 — Post-Launch Improvements (Week 8+)

After launch, the following enhancements are planned based on priority:

- **Content management module** for the Content Team.
- **Email/notification triggers** when request statuses change.
- **Bulk operations** (approve or reassign multiple requests at once).
- **Data export** (CSV/Excel) for reporting.
- **Dashboard performance optimisation** as data volume grows.
- **Real-time activity feed** for live monitoring.

These will be scoped and scheduled after the core system is live and stable.

---

## Key Principles I Am Following

**Security first.** Passwords are stored securely. Sessions expire. Every action is logged. Role boundaries are enforced at every layer.

**No shortcuts on data integrity.** Status transitions follow strict rules. History is never overwritten. Deleted reviews are soft-deleted so the record remains.

**Built to grow.** The role system, the database structure, and the overall architecture are designed to accommodate new participant types, new roles, new metrics, and higher data volumes without needing to rebuild anything.

**Transparency through audit logs.** If something happened on the platform, we can trace exactly who did it and when. This is non-negotiable for an operational system.

---

## What I Need to Move Forward

1. **Review and approval** of this plan so I can begin Phase 1.
2. **Neon Postgres project credentials** (or approval to set one up).
3. **Confirmation of Day-1 roles and permissions** — are Super Admin, Operations Manager, and Content Team correct and complete for launch?
4. **Clarification on the Content Management module** — is this a Phase 1 requirement, or can it follow after the core system is live?
5. **Staging environment** — where should this be deployed for internal testing?

---

*I am confident in this plan and ready to begin as soon as it is approved. Each phase is designed to be reviewable on its own, so we will have regular checkpoints throughout the build.*
