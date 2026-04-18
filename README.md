# Medical Brigade Management Web App

> 🇪🇸 [Versión en español disponible aquí](./README-es.md)

Web app for medical brigade teams to manage one-day community health events. Each brigade has multiple medical areas with independent real-time queues. Staff register patients, assign them to areas, and operate live dashboards from tablets or phones in the field.

🌐 **Production:** [medical-brigade-management-webapp.vercel.app](https://medical-brigade-management-webapp.vercel.app)

---

## What it does

- **Brigade management** — create, configure, open, and close one-day medical events.
- **Area setup** — define medical stations (Dentistry, Nursing, etc.) with custom prefix, color, and optional patient limit.
- **Patient intake** — register patients with basic info and assign them to one or more areas in a single step.
- **Automatic turno generation** — each patient gets a global arrival number and an area-specific ticket (e.g. `D-12`) per area.
- **Real-time area dashboards** — each area sees its current turno and waiting queue live via WebSockets.
- **Queue operations** — call next, call specific, move to end, or remove — all with confirmation.
- **Staff management** — invite registered users or generate credentials for non-registered staff directly from the director panel.
- **Public display mode** — area dashboards can be made public (no login) for waiting room TVs or tablets.
- **Director overview** — real-time brigade-wide metrics: patients per area, throughput over time, capacity alerts.

---

## Stack

| Layer      | Technology                     |
| ---------- | ------------------------------ |
| Framework  | Next.js 16 (App Router)        |
| Language   | TypeScript 5 (strict)          |
| UI         | shadcn/ui + Tailwind CSS v4    |
| Charts     | Recharts                       |
| ORM        | Prisma 7                       |
| Database   | PostgreSQL via Supabase        |
| Auth       | Supabase Auth                  |
| Realtime   | Supabase Realtime (WebSockets) |
| Validation | Zod                            |
| Runtime    | Bun                            |
| Deploy     | Vercel                         |
| Tests      | Vitest + Playwright            |

---

## Architecture

**Clean Architecture + Screaming Architecture + Vertical Slicing.**

Domain slices (`brigades/`, `patients/`, `turnos/`, `areas/`, `members/`) each contain their own `domain/`, `application/`, and `infrastructure/` layers. Business logic never leaks into route handlers or React components.

Dependency rule: `domain/ ← application/ ← infrastructure/ ← app/`. Never reversed.

Full documentation: [`architecture/`](./architecture/README.md). Read before contributing.

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- [Docker](https://www.docker.com) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Setup

```bash
# 1. Clone
git clone https://github.com/your-org/medical-brigade-management-webapp.git
cd medical-brigade-management-webapp

# 2. Install dependencies
bun install

# 3. Start local Supabase (runs DB, Auth, Realtime, Studio)
bunx supabase start

# 4. Generate Prisma client
bun run db:generate
```

### Environment

`supabase start` prints all local credentials. Copy them into `.env.local`:

```bash
# Public — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."

# Server only — never sent to the client
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# Postgres — local (no PgBouncer in local dev)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

For cloud credentials (production / staging), see [deployment runbook](./docs/runbooks/00-dev-environment.md).

### Run

```bash
bun run dev
# → http://localhost:3000

# Supabase Studio (local DB browser)
# → http://127.0.0.1:54323
```

---

## Scripts

```bash
# Development
bun run dev           # Dev server → http://localhost:3000
bun run build         # Production build
bun run lint          # ESLint
bun run format        # Prettier

# Tests
bun run test          # Vitest (unit + integration)
bun run test:e2e      # Playwright (end-to-end)

# Database
bun run db:generate   # Regenerate Prisma client after schema changes
bun run db:migrate    # Create new migration (dev only)
bun run db:push       # Push schema without migration (prototyping only)
bun run db:studio     # Open Prisma Studio

# Supabase local
bunx supabase start   # Start local stack
bunx supabase stop    # Stop local stack
bunx supabase status  # Show URLs + credentials
bunx supabase db push # Apply supabase/migrations/ to local DB
```

---

## Project structure

```
medical-brigade-management-webapp/
├── app/               ← Next.js App Router (pages + API routes)
│   ├── (auth)/        ← login, register, invite
│   ├── (dashboard)/   ← protected pages (session required)
│   │   └── dashboard/ ← home, brigades, patients, profile
│   └── (public)/      ← public area dashboards (no login)
├── src/               ← Domain slices (Clean + Screaming Architecture)
│   ├── brigades/
│   ├── areas/
│   ├── patients/
│   ├── turnos/
│   └── members/
├── shared/            ← Cross-cutting infrastructure (Supabase, Prisma, Realtime)
├── components/        ← Shell, layout, and shadcn/ui primitives
│   ├── layout/        ← BottomNav, TopGreeting, PageHeader, MobileShell
│   └── ui/            ← button, card, input, badge, avatar, ...
├── prisma/            ← schema.prisma
├── supabase/
│   ├── config.toml    ← local dev config
│   └── migrations/    ← Prisma DDL + RLS policies + triggers + indexes
└── docs/runbooks/     ← Incident guides (EN + ES)
```

See [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md) for the complete file tree.

---

## Pages

| Route                                   | Description                                  |
| --------------------------------------- | -------------------------------------------- |
| `/`                                     | Landing                                      |
| `/login`                                | Sign in                                      |
| `/register`                             | Create account                               |
| `/dashboard`                            | Director home — active brigade + quick stats |
| `/dashboard/brigades`                   | Brigade list + filter                        |
| `/dashboard/brigades/new`               | Create brigade + areas                       |
| `/dashboard/brigades/[id]`              | Brigade detail — areas, stats, actions       |
| `/dashboard/brigades/[id]/settings`     | Edit brigade info, areas, members            |
| `/dashboard/brigades/[id]/patients/new` | Register patient + assign areas              |
| `/dashboard/brigades/[id]/areas/[id]`   | Area queue dashboard (staff view)            |
| `/dashboard/patients`                   | Patient search across active brigade         |
| `/dashboard/profile`                    | User profile + preferences                   |
| `/dashboard/[brigadeId]/[areaId]`       | Public turno display (TV / tablet)           |

---

## API

All endpoints versioned under `/api/v1/`. See [`architecture/07-api-routes.md`](./architecture/07-api-routes.md) for the full route map, request/response shapes, and error codes.

Response envelope:

```json
{ "success": true, "data": {}, "errors": null }
```

Error codes are `SCREAMING_SNAKE_CASE` in English. Error messages are in Spanish.

---

## Switching between local and cloud

```bash
# Switch to local Supabase
bunx supabase start
# (credentials auto-written to .env.local on first run, or copy from `supabase status`)

# Switch back to cloud
cp .env.local.cloud .env.local
```

---

## Contributing

1. Branch from `dev`: `git checkout -b feature/your-feature dev`
2. Make changes.
3. `bun run lint` + `bun run test` before pushing.
4. Open PR targeting `dev`.
5. All GitHub Actions checks must pass before merging.

See [`architecture/08-deployment.md`](./architecture/08-deployment.md) for branching strategy and CI/CD pipeline.

---

## Runbooks

| #   | Runbook (EN)                                                             | Guía (ES)                                                                   | When                                                     |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | -------------------------------------------------------- |
| 00  | [Dev Environment](./docs/runbooks/00-dev-environment.md)                 | [Entorno local](./docs/runbooks/es/00-entorno-local.md)                     | Setting up local dev / switching between local and cloud |
| 01  | [WebSocket Disconnection](./docs/runbooks/01-websocket-disconnection.md) | [Desconexión del dashboard](./docs/runbooks/es/01-desconexion-websocket.md) | Dashboard stops updating                                 |
| 02  | [Queue Stuck](./docs/runbooks/02-queue-stuck.md)                         | [Cola trabada](./docs/runbooks/es/02-cola-trabada.md)                       | Turno won't advance                                      |
| 03  | [Patient Duplicate](./docs/runbooks/03-patient-duplicate.md)             | [Paciente duplicado](./docs/runbooks/es/03-paciente-duplicado.md)           | Patient registered twice                                 |

---

## License

Open source. License TBD.
