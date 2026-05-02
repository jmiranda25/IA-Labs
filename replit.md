# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Clerk (Spanish locale, shadcn theme)
- **Object Storage**: Replit Object Storage (avatars at `/api/storage/objects/avatars/…`)
- **Frontend**: React + Vite + Tailwind + shadcn/ui

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Implemented Features

### `/perfil` — Profile Editing Page
- Drag-and-drop avatar upload (multer → Object Storage, 5 MB cap)
- Edit displayName, @username (with live availability check), bio (280 char), location, website, skills
- React Hook Form + Zod validation, optimistic UI, Sonner toasts
- Backend: `POST /api/users/me/avatar`, `GET /api/users/check-username`, `PUT /api/users/me`

### `/miembros` — Member Directory
- Cursor-based keyset pagination (`joinedAt DESC, id DESC`)
- Search bar (300 ms debounce) — ILIKE on displayName + username
- Role filter tabs: Todos / Participantes / Admins
- Infinite scroll via `useInfiniteQuery` + `react-intersection-observer`
- Cards: avatar, displayName, @username, role badge, first 80 chars of bio
- Links to `/miembros/:username`; old `/members` redirects here

### `/miembros/:username` — Public Profile Page
- Full public profile: avatar, name, @username, role badge, full bio
- Location, website (linked), skills (badges), joined date (Spanish `date-fns`)
- 404 state with back-link when username not found
- Backend: `GET /api/users/by-username/:username` → `PublicUser` (no email/clerkId/isBanned)

### `/eventos` — Events Module
- **List page** (`/eventos`): tabs Próximos / Pasados, mode filter (Online/Presencial), debounced search, infinite scroll via `useInfiniteQuery` + `react-intersection-observer`
- **Detail page** (`/eventos/:slug`): cover hero, Intl.DateTimeFormat range, capacity bar, RSVP buttons (Voy / Me interesa / Cancelar), react-markdown description, meeting URL revealed only to confirmed/interested users
- **DB schema**: `events` table — slug (unique), `startsAt`, `endsAt`, `isOnline`, `meetingUrl`, `capacity`, `coverUrl`, `createdBy`; `rsvps` table — unique(eventId, userId), status enum (going/interested/cancelled)
- **Backend**: `GET /api/events` (cursor paginated, `status`/`mode`/`q` filters), `GET /api/events/:slug`, `POST /api/events/:slug/rsvp` (upsert, 409 if event_full), admin CRUD at `/api/admin/events`, cover upload at `/api/admin/events/:slug/cover` via Object Storage
- **Admin tab**: "Eventos" tab in `/admin` — table with cover thumbnail, create/edit Dialog (RHF + Zod), inline cover upload, delete with confirm
- Legacy `/events` and `/events/:eventId` redirect to `/eventos`
- Dependencies added: `react-markdown`, `remark-gfm`

### API Safety
- All `/api/users` endpoints require Clerk auth (`requireAuth` middleware)
- `PublicUser` schema excludes: email, clerkId, isBanned, updatedAt
- Cursor is base64(JSON.stringify({ joinedAt, id })) — opaque to clients
