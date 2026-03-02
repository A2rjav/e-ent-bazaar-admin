# Deployment: Admin Panel (AWS) + Backend (Railway)

Yes, you can deploy this Next.js admin panel on **AWS** and keep your backend on **Railway**. They work together as long as the frontend knows the backend URL and the backend allows requests from the frontend origin (CORS).

---

## Architecture

- **Frontend (this repo):** Next.js app → deploy on **AWS** (Amplify, EC2, ECS, or static on S3+CloudFront).
- **Backend:** NestJS API → already or to be deployed on **Railway**.
- **Communication:** Browser sends requests from the AWS-hosted domain to the Railway API URL. Auth uses JWT in `Authorization` header (no cookies), so cross-origin is fine.

---

## 1. Backend (Railway)

- Deploy your NestJS backend on Railway and note the public URL, e.g.  
  `https://your-backend.up.railway.app`
- **CORS:** Configure the backend to allow the frontend origin(s), e.g.:
  - `https://your-admin-domain.com`
  - Or your AWS Amplify/CloudFront URL during testing
- No change needed in the frontend code for auth: JWT is sent in the header from the browser.

---

## 2. Frontend (AWS)

### Env var (required)

Set the backend base URL (no trailing slash):

```bash
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
```

- **Amplify:** Project → Environment variables → add `NEXT_PUBLIC_API_URL`.
- **EC2/ECS/other:** Set in the environment where you run `next start` or in your build/deploy config.

The app uses this in `lib/api.ts`; all API calls go to `NEXT_PUBLIC_API_URL + path` (e.g. `/api/admin/auth/me`).

### Build and run

```bash
npm ci
npm run build
npm start
```

- **Port:** Next.js runs on `3000` by default. Change with `PORT=3000` (or your platform’s port config).

---

## 3. AWS deployment options

| Option | Best for | Notes |
|--------|----------|--------|
| **AWS Amplify** | Easiest for Next.js | Connect repo, set `NEXT_PUBLIC_API_URL`, auto build and deploy. |
| **EC2 or ECS** | Full control | Run `next build && next start` (Node server). Use Nginx/ALB in front if needed. |
| **S3 + CloudFront** | Static only | Requires `output: 'export'` in `next.config.mjs` and a static build; current app uses client-side data fetching and is compatible if you add static export. |

Recommended for simplicity: **Amplify** (Next.js SSR supported) or **EC2/ECS** with `next start`.

---

## 4. Checklist

- [ ] Backend deployed on Railway; public URL known.
- [ ] Backend CORS allows your frontend origin (e.g. Amplify or custom domain).
- [ ] Frontend env: `NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app` (no trailing slash).
- [ ] Frontend build: `npm run build` succeeds.
- [ ] After deploy, test login and a few API-backed screens to confirm CORS and auth.

---

## 5. Project status (brief)

- **Build:** `npm run build` completes successfully.
- **API base:** Read from `process.env.NEXT_PUBLIC_API_URL` (see `lib/api.ts`); no hardcoded backend URL.
- **Auth:** JWT in `localStorage`, sent as `Authorization: Bearer <token>`; works cross-origin.
- **Data fetching:** All from the client (`"use client"`); no server-side calls to the backend, so no extra env needed on the server for API URL.

You’re good to deploy the frontend on AWS and keep the backend on Railway; just set the env var and CORS correctly.
