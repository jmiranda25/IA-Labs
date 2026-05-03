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

### `/foro` — Forum Module (full implementation)
- **DB schema**: `forum_categories` (id, name, slug, description, color, orderIndex), `forum_threads` (id, categoryId, authorId, title, slug, body, pinned, locked, createdAt, lastActivityAt), `forum_posts` (id, threadId, authorId, body, parentPostId, createdAt, editedAt), `forum_reactions` (id, postId, userId, emoji, unique per post+user+emoji)
- **Category list** (`/foro`): color-coded cards with thread/post counts; seeded with 6 Spanish categories
- **Thread list** (`/foro/:categoria`): pinned threads always first (no pagination), non-pinned cursor-paginated by lastActivityAt DESC; "Nuevo tema" Dialog; infinite scroll
- **Thread detail** (`/foro/:categoria/:threadId`): thread body, post list with emoji reactions (6 emojis), reply composer, 15-min edit window for author, admin pin/lock toggles in dropdown
- **Backend** (`artifacts/api-server/src/routes/forum.ts`): `GET /api/forum/categories`, `GET /api/forum/categories/:slug/threads`, `POST /api/forum/threads`, `GET/PATCH/DELETE /api/forum/threads/:id`, `POST /api/forum/threads/:id/posts`, `PATCH/DELETE /api/forum/posts/:id`, `POST /api/forum/posts/:id/reactions` (toggle), `POST /api/admin/forum/threads/:id/pin`, `POST /api/admin/forum/threads/:id/lock`
- **Reactions**: toggle emoji (add if absent, remove if present); returns full reaction summary with `hasReacted`
- **Edit window**: 15 minutes for own content; admins can edit/delete anytime
- **Notifications**: new post notifies thread author (skips if self-reply)
- Legacy `/forum` and `/forum/:postId` redirect to `/foro`
- `req.isAdmin` now declared on Express Request and set by `requireAdmin` middleware

### API Safety
- All `/api/users` endpoints require Clerk auth (`requireAuth` middleware)
- `PublicUser` schema excludes: email, clerkId, isBanned, updatedAt
- Cursor is base64(JSON.stringify({ joinedAt, id })) — opaque to clients

### `/recursos` — Resources Module (full implementation)
- **DB schema**: `resources` (id, title, slug unique, type enum link/file/course, url nullable, file_path nullable, description, cover_url nullable, author_id FK, published bool default false, created_at), `resource_tags` (id, resource_id FK cascade, tag, unique resource_id+tag, idx on tag)
- **List** (`/recursos`): type tabs (Todos/Enlaces/Archivos/Cursos), debounced search, tag chips (multi-select, URL-synced), infinite scroll via `useInfiniteQuery` + cursor, cover thumbnails, type icons
- **Detail** (`/recursos/:slug`): cover, type badge, author chip, tag links, react-markdown description, "Abrir"/"Descargar" CTA based on type
- **Submit** (`/recursos/nuevo`): RHF + Zod form, conditional URL/file fields, drag-drop-style file picker, Markdown description, pending state message after submit
- **Backend** (`artifacts/api-server/src/routes/resources.ts`): `GET /api/resources` (cursor paginated, q/type/tags filters, published OR own unpublished), `GET /api/resources/:slug`, `POST /api/resources`, `POST /api/resources/:slug/file` (multer → Object Storage, ACL private), `DELETE /api/resources/:slug`, `GET /api/admin/resources`, `POST /api/admin/resources/:slug/publish` (sets ACL public-read + notifies author), `POST /api/admin/resources/:slug/reject` (deletes file + row + notifies author)
- **Admin tab** (`/admin` → "Recursos" tab): pending queue with Aprobar/Rechazar buttons; side-by-side preview pane shows cover, tags, description, link before publishing; reject dialog requires reason text
- Legacy `/resources` redirects to `/recursos`; nav link updated to `/recursos`

### `/marketplace` — Marketplace + Private Messaging (full implementation)
- **DB schema**: `marketplace_listings` (id, seller_id FK, title, slug unique, description, price numeric nullable, currency default 'USD', category, `listing_status` enum draft/pending/active/sold/rejected, created_at, updated_at) + `listing_images` (id, listing_id cascade, url, order_index) + `listing_messages` (id, listing_id cascade, from_id FK, to_id FK, body, read_at nullable, created_at; index on to_id+read_at)
- **Old tables** (`marketplace_listings` + `marketplace_messages`) dropped and recreated
- **Backend** (`artifacts/api-server/src/routes/marketplace.ts`): cursor-paginated listing list (q/category/minPrice/maxPrice), seller dashboard, detail by slug, create (status=pending), PATCH (seller/admin), image upload (multer → Object Storage, max 6), mark-as-sold, messages endpoint, thread list, thread detail (marks read on fetch), admin list/approve/reject with pushNotification
- **Admin block**: `GET /messages/threads/:listingId/:otherUserId` explicitly returns 403 for admins who are not a thread participant
- **Frontend pages**:
  - `/marketplace`: filter sidebar (category select, price range min/max, search) + listing grid with cover image, price, category badge, seller name
  - `/marketplace/:slug`: shadcn Carousel image carousel, react-markdown description, price, category, seller card + link to `/miembros/:username`, "Contactar al vendedor" → navigates to `/mensajes/:listingId/:sellerId`; seller sees Edit + "Marcar vendido" actions
  - `/marketplace/mis-anuncios`: seller dashboard with status tabs (Todos/Borradores/En revisión/Activos/Vendidos/Rechazados), create listing dialog (RHF+Zod), edit dialog, image upload per-listing, mark-as-sold button
  - `/mensajes`: thread list with unread badges, live-updated via SSE `message_received` events, links to thread view
  - `/mensajes/:listingId/:otherUserId`: chat-style bubbles, auto-scroll to bottom, Enter-to-send, read receipts
- **Admin tab** (`/admin` → "Marketplace" tab): pending queue with thumbnail, approve/reject buttons, side-by-side preview pane; reject dialog requires reason
- Nav updated: `/messages` → `/mensajes`, `/marketplace/mis-anuncios` linked from marketplace header

### Pre-launch Polish (SEO, A11y, Mobile, Performance)
- **react-helmet-async**: `HelmetProvider` in `App.tsx`; per-route `<Helmet>` on all public pages (landing, eventos, recursos, marketplace, miembros, foro, foro-hilo, evento-detalle, recurso-detalle, marketplace-listing)
- **JSON-LD**: Event schema on `/eventos/:slug`
- **Sitemap**: Dynamic `/api/sitemap.xml` route in `artifacts/api-server/src/routes/seo.ts` — queries events, forum categories/threads, resources, marketplace listings
- **robots.txt**: Static file at `artifacts/web/public/robots.txt` — disallows /admin /perfil /mensajes /settings /api/
- **React.lazy**: All 20+ page components are lazy-loaded in `App.tsx` with `Suspense` + `ErrorBoundary`
- **ErrorBoundary**: `artifacts/web/src/components/error-boundary.tsx` — catches render errors, shows Spanish fallback UI
- **Focus rings**: Global `@layer base { :focus-visible { outline: 2px solid hsl(var(--ring)) } }` in `index.css`
- **Lazy images**: `loading="lazy"` on cover images in eventos/recursos/marketplace pages
- **Dialog mobile**: `max-h-[90dvh] overflow-y-auto` added to `DialogContent` component
- **Mobile nav**: Layout Sheet now includes Mi perfil + Configuración links at the bottom (previously desktop-sidebar-only)
- **Body overflow**: `body { overflow-x: hidden }` in `index.css`
- **Admin table**: `overflow-x-auto` + `min-w-[480px]` on the user management table for mobile scroll
- **Forum Layout fix**: `foro-categoria.tsx` and `foro-hilo.tsx` were missing `<Layout>` wrappers — fixed
- **Foro Layout fix**: `foro.tsx` was missing `<Layout>` wrapper — fixed (prior session)
- **not-found.tsx**: Rewritten in Spanish with back-link
- **forbidden.tsx**: New page for 403/access-denied state
- **aria-labels**: Added to all icon-only buttons (navigation back-arrows, dropdown triggers, send button, admin edit/delete)

### `/m/:username` — Member Card (public shareable page, with sharing features)
- **Public route** — no auth required, accessible without login
- **DB**: `is_public` boolean column added to `users` table (default `true`)
- **Backend** (`artifacts/api-server/src/routes/public.ts`):
  - `GET /api/public/users/:username` — returns safe card fields (id, username, displayName, bio, avatarUrl, role, location, website, skills, joinedAt); 404 if user not found or `isPublic=false`
  - `GET /api/public/users/:username/stats` — returns `{ eventsAttended, threadsCreated, resourcesShared, memberSince }` counting RSVPs (going), forum threads, and published resources
- **Backend** (`artifacts/api-server/src/routes/users.ts`): `PATCH /api/users/me/card-visibility` — toggles `isPublic`, requires auth
- **Frontend** (`artifacts/web/src/pages/tarjeta-miembro.tsx`): standalone page (no Layout wrapper), gradient dark background, card with avatar-overlapping-header, stats bar, skills badges, copy-link button, CTA to join/directory
- **Perfil page** — "Tarjeta de miembro" card at bottom: public/private toggle button + link preview with "Ver" button; shows reminder to set username if none set
- **Sidebar** — "Ver mi tarjeta" link in bottom section (only shown if user has a username)
- **Miembro profile** (`/miembros/:username`) — "Ver tarjeta" button next to the back link
- **Members directory** (`/miembros`) — "Ver tarjeta" mini-button on each card that has a username
- **OpenAPI spec**: new paths `/public/users/{username}`, `/public/users/{username}/stats`, `/users/me/card-visibility`; new schemas `MemberCard`, `MemberStats`, `CardVisibilityBody`, `CardVisibilityResponse`; `UserProfile` extended with `isPublic`
- **Download as PNG**: "Descargar tarjeta" button uses `html-to-image` `toPng` at `pixelRatio: 2`; iOS Safari fallback opens OG image in new tab with a save hint
- **Share buttons**: Copy link (Sonner toast), X/Twitter, LinkedIn, WhatsApp — all in header bar; action functions named `onDownloadCard`, `onCopyCardLink`, `onShareTwitter`, `onShareLinkedIn`, `onShareWhatsApp` for future analytics hooks
- **Dynamic OG image**: `GET /api/og/m/:username` via `satori` + `@resvg/resvg-js` (1200×630 PNG) — shows avatar, name, role badge, bio, location, top 3 skills, decorative orbs and accent line; fonts loaded from jsDelivr fontsource CDN (Inter 400+700 woff, cached in memory); `Cache-Control: public, max-age=3600, s-maxage=86400`; 404 returns 1×1 transparent PNG for private/missing users
- **OG meta tags**: `og:image` → absolute URL to `/api/og/m/:username`; `og:type=profile`; `og:image:width/height`; `twitter:card=summary_large_image`; canonical `<link>` tag
- **JSON-LD Person schema**: `@type=Person`, name, image, url, jobTitle, knowsAbout (skills array), memberOf Comunidad IA organization
- **Build**: `@resvg/resvg-js` added to esbuild externals in `build.mjs` (native NAPI bindings must not be bundled)

### Schema Migration Notes
- **Never run `pnpm --filter @workspace/db run push`** — it hangs; always use `psql "$DATABASE_URL"` directly
- Forum schema renamed: `forum_posts` → `forum_threads` (threads), new `forum_posts` (replies), new `forum_reactions`
- Resources schema fully replaced: old `resources` table dropped, new `resources` + `resource_tags` tables created with `resource_type` enum
