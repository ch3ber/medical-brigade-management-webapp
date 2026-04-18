# Medical Brigade Management Web App

> 🇲🇽 [Versión en español disponible aquí](./README-es.md)

A web application for medical brigade teams to manage and operate their one-day community health events. Each brigade has multiple medical areas with independent real-time queues. Staff register patients, assign them to areas, and operate live dashboards from tablets or phones in the field.

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
| Framework  | Next.js 14 (App Router)        |
| Language   | TypeScript 5                   |
| UI         | shadcn/ui + Tailwind CSS       |
| Charts     | Recharts                       |
| ORM        | Prisma 5                       |
| Database   | PostgreSQL via Supabase        |
| Auth       | Supabase Auth                  |
| Realtime   | Supabase Realtime (WebSockets) |
| Validation | Zod                            |
| Runtime    | Bun                            |
| Deploy     | Vercel                         |
| Tests      | Vitest + Playwright            |

---

## Architecture

The project follows **Clean Architecture + Screaming Architecture + Vertical Slicing**. Domain slices (`brigades/`, `patients/`, `turnos/`, `areas/`, `members/`) each contain their own `domain/`, `application/`, and `infrastructure/` layers. Business logic never leaks into route handlers or React components.

Full architecture documentation lives in [`architecture/`](./architecture/README.md). Read it before contributing.

---

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project (free tier works for development)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/medical-brigade-management-webapp.git
cd medical-brigade-management-webapp

# 2. Install dependencies
bun install

# 3. Configure environment variables
cp .env.example .env.local
# Open .env.local and fill in your Supabase credentials
```

### Environment variables

```bash
# Public
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server only
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=        # Supabase pooler (port 6543) — Prisma runtime
DIRECT_URL=          # Supabase direct (port 5432) — Prisma migrations only
```

### Database

```bash
# Generate Prisma client
bun run db:generate

# Apply migrations
bun run db:migrate

# (Optional) Seed development data
bun run db:seed
```

### Run

```bash
bun run dev
# → http://localhost:3000
```

---

## Scripts

```bash
bun run dev           # Development server
bun run build         # Production build
bun run lint          # ESLint
bun run format        # Prettier
bun run test          # Vitest (unit + integration)
bun run test:e2e      # Playwright (end-to-end)
bun run db:generate   # Regenerate Prisma client
bun run db:migrate    # Create a new migration (dev only)
bun run db:push       # Push schema without migration (prototyping only)
bun run db:studio     # Open Prisma Studio
```

---

## Project structure

```
medical-brigade-management-webapp/
├── app/               ← Next.js App Router (pages + API routes)
├── src/               ← Domain slices (Clean + Screaming Architecture)
│   ├── brigades/
│   ├── areas/
│   ├── patients/
│   ├── turnos/
│   └── members/
├── shared/            ← Cross-cutting infrastructure (Supabase, Prisma, Realtime)
├── components/        ← Shell and layout components
├── prisma/            ← Schema + migrations
├── supabase/          ← RLS policies + triggers (SQL)
└── architecture/      ← Full architecture documentation
```

See [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md) for the complete file tree.

---

## API

All endpoints are versioned under `/api/v1/`. See [`architecture/07-api-routes.md`](./architecture/07-api-routes.md) for the full route map, request/response shapes, and error codes.

---

## Contributing

1. Branch from `develop`: `git checkout -b feature/your-feature develop`
2. Make your changes.
3. Run `bun run lint` and `bun run test` before pushing.
4. Open a PR targeting `develop`.
5. All GitHub Actions checks must pass before merging.

See [`architecture/08-deployment.md`](./architecture/08-deployment.md) for the full branching strategy and CI/CD pipeline.

---

## License

This project is open source. License to be defined.
