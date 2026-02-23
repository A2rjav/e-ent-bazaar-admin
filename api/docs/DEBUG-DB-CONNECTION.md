# Debugging database connection (Neon)

When you see: **Can't reach database server at `...neon.tech:5432`** (Prisma error `P1001`), use these steps.

---

## 1. Check your connection string

- Open **`api/.env`** and ensure you have:
  ```env
  DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
  ```
- For **Neon**, use the **pooled** connection string from the Neon dashboard (Connection string → "Pooled connection"). It usually looks like:
  ```text
  postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
  ```
- Do **not** use the "Direct" connection string for serverless/Prisma unless you need it; pooled is better for connections from your machine.

---

## 2. Run the connection test script

From the **`api`** folder:

```bash
node scripts/debug-db-connection.js
```

- If it prints **OK: Connected** and **OK: Query test**, the URL is valid and the DB is reachable; the issue may be environment (e.g. API not loading `.env`).
- If it prints **Connection failed**, note the **Code** and **Message** and continue below.

---

## 3. Neon dashboard checks

1. **Project not suspended**  
   In Neon: Project → Overview. If the project is suspended, resume it.

2. **Correct connection string**  
   Project → Connection details → **Pooled connection** → copy the full URL (with password) into `api/.env` as `DATABASE_URL`.

3. **IP / firewall**  
   Neon allows all IPs by default. If your company uses a firewall or proxy, ensure outbound **TCP 5432** (and HTTPS if you use a proxy) is allowed to `*.neon.tech`.

---

## 4. Network / connectivity

- **Internet:** Ensure the machine has internet (e.g. open https://neon.tech in a browser).
- **VPN:** Try with VPN off (or on, depending on where your DB is allowed).
- **Test port (PowerShell):**
  ```powershell
  # Replace HOST with your Neon host, e.g. ep-flat-salad-a1v2kn64-pooler.ap-southeast-1.aws.neon.tech
  Test-NetConnection -ComputerName "ep-flat-salad-a1v2kn64-pooler.ap-southeast-1.aws.neon.tech" -Port 5432
  ```
  If `TcpTestSucceeded` is `False`, something (firewall, proxy, ISP) is blocking port 5432.

---

## 5. SSL

Neon requires SSL. Your URL should include **`?sslmode=require`** (or `?sslmode=no-verify` only for quick local tests). Example:

```text
postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
```

---

## 6. Quick Prisma check

From **`api`**:

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma
```

Type `SELECT 1;` then press Enter, then Ctrl+Z and Enter (Windows) to send. If this fails with the same "Can't reach database server", the problem is connection/URL/network, not your app code.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Ensure `DATABASE_URL` in `api/.env` is the Neon **pooled** URL with `?sslmode=require`. |
| 2 | Run `node scripts/debug-db-connection.js` from `api/`. |
| 3 | In Neon: project not suspended; copy fresh connection string. |
| 4 | Check internet/VPN and `Test-NetConnection ... -Port 5432`. |
| 5 | Fix URL/SSL/network, then run `npm run start:dev` again. |
