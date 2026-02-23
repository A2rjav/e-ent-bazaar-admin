# e-ENT Bazaar Admin API

NestJS backend for the admin panel. Participants module: list and activate/deactivate.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your Postgres connection string (Neon or Supabase)
   - If the database already has the tables (`manufacturers`, `endcustomers`, `coal_providers`, `transport_providers`, `labour_contractors`), run:
     ```bash
     npx prisma generate
     ```
   - If you need to create tables from this schema (new DB):
     ```bash
     npx prisma migrate dev --name init_participants
     ```

3. **Run**
   ```bash
   npm run start:dev
   ```
   API runs at `http://localhost:3001` (default). Base path: `/api`.

## Participants API

- **GET** `/api/admin/participants?type=MANUFACTURER|ENDCUSTOMER|COAL_PROVIDER|TRANSPORT_PROVIDER|LABOUR_CONTRACTOR&search=&page=1&limit=10`  
  Returns paginated list; response shape matches admin panel `Participant` and `PaginatedResponse`.

- **PATCH** `/api/admin/participants/:type/:id/activate`  
  Activate participant (manufacturers: status=Active; endcustomers: deleted_at=null; labour_contractors: is_active=true).

- **PATCH** `/api/admin/participants/:type/:id/deactivate`  
  Deactivate participant.

## Frontend

Point the admin panel to this API (e.g. `NEXT_PUBLIC_API_URL=http://localhost:3001`) and replace mock `getParticipants` / `toggleParticipant` with `fetch` calls to these endpoints.
