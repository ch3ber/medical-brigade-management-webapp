# 02 — Stack

## At a glance

| Layer | Technology | Version |
|---|---|---|
| Runtime | Bun | latest stable |
| Framework | Next.js (App Router) | 14.x |
| Language | TypeScript | 5.x |
| UI components | shadcn/ui | latest |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| Form validation | Zod | 3.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL via Supabase | 15.x |
| Auth | Supabase Auth | — |
| Realtime | Supabase Realtime (WebSockets) | — |
| Deploy | Vercel | — |
| DB hosting | Supabase | — |
| Unit / integration tests | Vitest + Testing Library | — |
| End-to-end tests | Playwright | — |
| Linting | ESLint | — |
| Formatting | Prettier | — |

---

## Decision rationale

### Bun
Used as the runtime and package manager instead of Node.js + npm/pnpm. Bun is significantly faster for installs and script execution. Next.js 14 runs on Bun without configuration changes. All `bun run`, `bun install`, and `bun test` commands replace their npm/pnpm equivalents throughout the project.

### Next.js 14 with App Router
Server components handle data fetching close to the database without exposing sensitive queries to the client. Client components handle Supabase Realtime subscriptions and interactive queue dashboards. The App Router layout system makes it straightforward to build per-brigade and per-area pages that share context through nested layouts.

API routes (Route Handlers) live in the same codebase as the frontend — no separate backend service needed at this scale.

### TypeScript
Strict mode enabled. All database models, API request/response shapes, and Zod schemas are fully typed. Type errors in CI block deployment.

### shadcn/ui + Tailwind CSS
shadcn/ui components are copied directly into the repo under `components/ui/` — they are not an external dependency. This gives full control over every component without being blocked by library update cycles. Tailwind keeps styles collocated with components and eliminates stylesheet drift across a solo project.

### Recharts
Declarative React charting library. Re-renders cleanly when Supabase Realtime pushes new data into React Query's cache. Used exclusively for the director overview dashboard (patients per area, turnos served over time). Individual area dashboards display turno numbers and queues as custom Tailwind components — not charts.

### Zod
All API route handlers validate incoming request bodies with Zod schemas before touching the database. The same schemas are reused on the frontend for form validation via `react-hook-form` + `@hookform/resolvers/zod`. One schema definition, validated in both places.

### Prisma ORM
Prisma generates a fully typed database client from `schema.prisma`. Any mismatch between the database shape and application code is a compile-time error. Used for all write operations, complex queries, and transactions (e.g. atomic turno generation with advisory locks). Prisma Migrate manages all schema changes through versioned migration files.

### Supabase (PostgreSQL + Auth + Realtime)
Supabase is the single backend service. It provides:

- **PostgreSQL 15** — relational data with Row-Level Security (RLS) enforced at the database level.
- **Supabase Auth** — session management with JWT cookies, magic link login, and invite flows for staff onboarding.
- **Supabase Realtime** — WebSocket-based change broadcasting for live area queue dashboards. No separate WebSocket server needed.

This eliminates the need for a separate auth service, a WebSocket server, or any caching layer for the expected load of fewer than 50 simultaneous users.

### Vercel
Zero-configuration deployment for Next.js. Automatic preview deployments for every pull request. Production deployments triggered on merge to `main`. Environment variables managed through the Vercel dashboard.

### Vitest + Testing Library
Vitest is the unit and integration test runner. It is faster than Jest and natively compatible with Bun and ESM modules. Testing Library is used for component tests. Critical logic tested: turno generation and ordering, queue advancement, RLS policy behavior, and API route validation.

### Playwright
End-to-end tests cover the critical user flows: patient registration with multi-area assignment, queue advancement (served, moved to end, removed), and brigade open/close lifecycle. Playwright runs against a test Supabase project in CI.

### ESLint + Prettier
ESLint enforces code quality rules (Next.js recommended config + TypeScript rules). Prettier handles all formatting. Both run as pre-commit hooks via `lint-staged` and in CI. No debates about formatting — Prettier decides.

---

## What was explicitly rejected

| Technology | Reason |
|---|---|
| Redis | Overkill for fewer than 50 users. Supabase Realtime covers all pub/sub needs. |
| GraphQL | Adds schema complexity and tooling overhead with no benefit at this scale. REST + Zod is simpler and easier to maintain solo. |
| Microservices | A single Next.js monolith is the correct deployment unit for this project. |
| tRPC | Adds a build-time coupling between client and server. REST routes are easier to document and will be reusable by the future mobile app. |
| Pusher | Redundant — Supabase Realtime covers the use case natively. |
| Chart.js | Requires DOM refs and imperative updates that clash with React's declarative model. |
| D3.js | Too low-level for dashboard widgets. The power-to-complexity tradeoff is not worth it here. |
| Turborepo | Only warranted if the project splits into multiple packages. Not needed for a single Next.js app. |
| Clerk | Adds a paid third-party dependency for auth that Supabase already provides. |
| Drizzle ORM | Valid alternative to Prisma, but Prisma has better tooling for migrations and a more mature ecosystem at the time of this decision. |
| Jest | Replaced by Vitest for better ESM support and faster execution with Bun. |
| Cypress | Replaced by Playwright for better developer experience and parallel test execution. |

---

## Local development setup

```bash
# Prerequisites: Bun (latest), Supabase CLI

bun install
cp .env.example .env.local   # fill in Supabase keys

bun run db:generate           # prisma generate
bun run db:push               # push schema to local / dev Supabase
bun run dev                   # starts Next.js on http://localhost:3000
```

### Required environment variables

```bash
# Public — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server only — never sent to the client
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=           # Postgres connection string with PgBouncer (for Prisma runtime)
DIRECT_URL=             # Direct Postgres connection (for Prisma migrations only)
```

> `DATABASE_URL` uses the Supabase connection pooler (port 6543) for runtime queries.
> `DIRECT_URL` uses the direct connection (port 5432) for `prisma migrate deploy` only.

### Useful scripts

```bash
bun run dev           # development server
bun run build         # production build
bun run lint          # ESLint
bun run format        # Prettier
bun run test          # Vitest (unit + integration)
bun run test:e2e      # Playwright (end-to-end)
bun run db:generate   # regenerate Prisma client after schema changes
bun run db:migrate    # create a new migration (dev only)
bun run db:push       # push schema without migration file (prototyping only)
bun run db:studio     # open Prisma Studio
```
