# Demo Seed Scripts

Scripts for populating the AI Comunidad platform with realistic demo data so you can explore all features across different user roles without manually creating accounts.

## Scripts

### `seed:demo` — Populate demo data

```bash
pnpm --filter @workspace/scripts run seed:demo
```

Creates 10 users in Clerk + DB plus realistic content:

| Count | Type |
|-------|------|
| 2 | Admin users |
| 8 | Participant users |
| 4 | Events (2 past, 2 future) |
| 8 | Forum threads with replies & reactions |
| 6 | Resources (links, files, courses) |
| 6 | Marketplace listings (active) |
| 12 | Notifications |

**Idempotent** — safe to run multiple times. Existing records are updated via `ON CONFLICT DO UPDATE`, never duplicated.

After running, credentials are written to `/tmp/seed-demo-credentials.md`.

### `seed:demo:clean` — Remove all demo data

```bash
pnpm --filter @workspace/scripts run seed:demo:clean
```

Deletes all Clerk users and DB records with emails ending in `@aicomunidad.test`. Content is removed in cascade. The real admin account (`mayckolco@gmail.com`) is never touched — the script will abort with an error if it's ever in the list.

---

## Demo Users

| Display Name | Email | Password | Role |
|---|---|---|---|
| Lucía Méndez | lucia.mendez@aicomunidad.test | Demo2026! | administrator |
| Sofía Torres | sofia.torres@aicomunidad.test | Demo2026! | administrator |
| Carlos Reyes | carlos.reyes@aicomunidad.test | Demo2026! | participant |
| María García | maria.garcia@aicomunidad.test | Demo2026! | participant |
| Andrés López | andres.lopez@aicomunidad.test | Demo2026! | participant |
| Valentina Ruiz | valentina.ruiz@aicomunidad.test | Demo2026! | participant |
| Diego Fernández | diego.fernandez@aicomunidad.test | Demo2026! | participant |
| Camila Vargas | camila.vargas@aicomunidad.test | Demo2026! | participant |
| Roberto Silva | roberto.silva@aicomunidad.test | Demo2026! | participant |
| Isabel Ponce | isabel.ponce@aicomunidad.test | Demo2026! | participant |

---

## Role-based walkthrough guide

### Admin flow (as Lucía)

1. Log in as `lucia.mendez@aicomunidad.test` / `Demo2026!`
2. The sidebar should display an **Admin** item
3. Navigate to `/admin` to access the admin dashboard
4. Try moderating content, managing users, and reviewing reports
5. To promote María to admin: go to `/admin/users`, find María García, change role to `administrator`

### Changing a user's role (admin action)

1. Log in as Lucía (admin)
2. Go to `/admin/users` → find María García
3. Set role to `administrator` → save
4. Log out
5. Log in as `maria.garcia@aicomunidad.test` / `Demo2026!`
6. The sidebar now shows the **Admin** item

> **Note:** The role change takes effect on next login. SSE-based live role updates are a planned future feature (TODO).

### Participant flow (as Carlos)

1. Log in as `carlos.reyes@aicomunidad.test` / `Demo2026!`
2. The sidebar should **not** show the Admin item
3. Browse `/foro` — Carlos has an active "build in public" thread (locked)
4. Check `/marketplace` — Carlos has a listing for his LangChain agent
5. The notification bell should show unread badges

### Content exploration

| Page | What to expect |
|------|----------------|
| `/miembros` | 10 users with avatars, bios, skills, and locations |
| `/eventos` | 4 events: 2 past (Jan/Feb 2026), 2 future (upcoming) |
| `/foro` | 8 threads across categories with replies and emoji reactions |
| `/recursos` | 6 published resources (links, templates, courses) |
| `/marketplace` | 6 active listings with images and conversations |

---

## Environment variables required

| Variable | Description |
|----------|-------------|
| `CLERK_SECRET_KEY` | Clerk secret key (already in Replit secrets) |
| `DATABASE_URL` | Postgres connection string (already in Replit secrets) |

Both are available automatically in the Replit environment.
