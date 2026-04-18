<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## What this project is

**medical-brigade-management-webapp** is a Next.js 14 web application for medical brigade teams. A brigade is a single-day community health event with multiple medical stations (areas). Patients are registered, receive shift tickets (turnos), and are attended across one or more areas. Each area has a real-time queue dashboard operated by staff from tablets or phones.

Read [`architecture/01-overview.md`](./architecture/01-overview.md) for the full domain explanation before touching any domain logic.

---

## Architecture — read this first

The project follows three patterns applied together:

- **Clean Architecture** — dependencies always point inward: `domain/` → `application/` → `infrastructure/`. Never the reverse.
- **Screaming Architecture** — `src/` contains domain slices named after the business: `brigades/`, `areas/`, `patients/`, `turnos/`, `members/`.
- **Vertical Slicing** — each domain slice owns its full stack: entities, use cases, repository implementations, and React components.

### Dependency rules — never violate these

```
domain/          →  no imports from anywhere inside the project
application/     →  imports from domain/ only
infrastructure/  →  imports from domain/ + application/ + external packages
app/             →  imports from infrastructure/ only
shared/          →  imports from external packages only
```

If you find yourself importing Prisma inside a use case or importing a React component inside a domain entity, stop — that is a architecture violation.

### Full architecture documentation

| File                                                                                 | Read when                                                         |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| [`architecture/01-overview.md`](./architecture/01-overview.md)                       | You need to understand the domain, user flows, or business rules  |
| [`architecture/02-stack.md`](./architecture/02-stack.md)                             | You need to know which library or tool to use and why             |
| [`architecture/03-database-schema.md`](./architecture/03-database-schema.md)         | You are working with the database, Prisma schema, or RLS policies |
| [`architecture/04-auth-and-roles.md`](./architecture/04-auth-and-roles.md)           | You are working with authentication, sessions, or permissions     |
| [`architecture/05-realtime-and-shifts.md`](./architecture/05-realtime-and-shifts.md) | You are working with the turno system or Supabase Realtime        |
| [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md)       | You need to know where a file should live                         |
| [`architecture/07-api-routes.md`](./architecture/07-api-routes.md)                   | You are writing or consuming an API route                         |
| [`architecture/08-deployment.md`](./architecture/08-deployment.md)                   | You are working with CI/CD, migrations, or environment variables  |

---

## Stack

| Layer      | Technology                             | Notes                                                                           |
| ---------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime    | Bun                                    | Use `bun` for all commands, never `npm` or `pnpm`                               |
| Framework  | Next.js 14 (App Router)                | Server components for data, client components for realtime                      |
| Language   | TypeScript 5                           | Strict mode. No `any`. No `// @ts-ignore` without explanation                   |
| UI         | shadcn/ui + Tailwind CSS               | Components live in `components/ui/`. Never install shadcn as a dependency       |
| ORM        | Prisma 5                               | All DB writes go through Prisma. Never raw SQL in application code              |
| Database   | PostgreSQL via Supabase                | RLS enabled on all tables                                                       |
| Auth       | Supabase Auth                          | Cookie-based sessions via `@supabase/ssr`                                       |
| Realtime   | Supabase Realtime (`postgres_changes`) | Invalidates React Query cache on change — never applies payload directly        |
| Validation | Zod                                    | Every API route body is validated before reaching the use case                  |
| Charts     | Recharts                               | Director overview only. Area dashboards use custom Tailwind components          |
| Tests      | Vitest + Playwright                    | Unit/integration in `tests/unit/` and `tests/integration/`. E2E in `tests/e2e/` |

---

## Project structure at a glance

```
app/                    ← Next.js pages + API Route Handlers (thin entry points)
  (auth)/               ← login, register, invite
  (dashboard)/          ← protected pages (requires session)
  (public)/             ← public area dashboard (no login)
  api/v1/               ← all API routes versioned under /api/v1/
src/                    ← domain slices (the real code lives here)
  brigades/
  areas/
  patients/
  turnos/
  members/
shared/                 ← Supabase clients, Prisma singleton, Realtime hooks
components/             ← layout shell + shadcn/ui primitives
prisma/                 ← schema.prisma + migrations/
supabase/               ← RLS policies + triggers (SQL)
docs/runbooks/          ← incident runbooks (EN for devs, es/ for staff)
architecture/           ← full architecture documentation
```

See [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md) for the complete file tree.

---

## Key domain decisions — always respect these

These are locked decisions. Do not propose changing them without flagging it explicitly.

**Turnos:**

- A patient can be assigned to multiple areas at registration time and after.
- Each area visit generates an independent area turno (`areaOrder`). The global turno (`globalOrder`) is assigned once at registration and never changes.
- Turno label format: `{prefix}-{areaOrder}` (e.g. `D-12`). Computed in the application layer — never stored in the DB.
- `areaOrder` never changes when a turno is moved to the tail. Instead, it is updated to `MAX(area_order) + 1` at move time.
- Only one `CALLED` turno per area at any given time. Enforced at the API layer.
- The system does not validate or prevent simultaneous turnos for the same patient across different areas. This is by design.

**Brigades:**

- Brigades are fully isolated. No data crosses brigade boundaries.
- Status transitions: `DRAFT` → `ACTIVE` → `CLOSED`. Both transitions are manual and recorded with timestamps.
- Areas can be edited while a brigade is `ACTIVE`.
- Cloning copies area configuration only — no patients, turnos, or members.

**Auth:**

- Staff can be added via invite link (existing user) or generated credentials (non-registered user).
- Public area dashboards are protected by a UUID dashboard token in the query string — no session required.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in `shared/supabase/admin.ts` and never sent to the browser.

**Concurrency:**

- `globalOrder` and `areaOrder` use `pg_advisory_xact_lock` inside Prisma transactions to prevent duplicate sequential numbers under concurrent inserts.

**API:**

- All routes are under `/api/v1/`.
- Response envelope: `{ success: boolean, data: T | null, errors: { code: string, message: string } | null }`.
- Error messages are always in Spanish. Error codes are in SCREAMING_SNAKE_CASE in English.

---

## Naming conventions

| Thing                      | Convention                    | Example                        |
| -------------------------- | ----------------------------- | ------------------------------ |
| React components           | PascalCase                    | `AreaDashboard.tsx`            |
| Domain entities            | PascalCase                    | `Turno.ts`                     |
| Value objects              | PascalCase                    | `TurnoLabel.ts`                |
| Repository interfaces      | PascalCase with `I` prefix    | `ITurnoRepository.ts`          |
| Repository implementations | kebab-case, technology prefix | `prisma-turno-repository.ts`   |
| Use cases                  | kebab-case, verb-noun         | `call-next-turno.ts`           |
| Domain events              | PascalCase, past tense        | `TurnoCalled.ts`               |
| Hooks                      | kebab-case with `use-` prefix | `use-area-queue.ts`            |
| Test files                 | Same name + `.test.ts`        | `call-next-turno.test.ts`      |
| E2E test files             | kebab-case + `.spec.ts`       | `patient-registration.spec.ts` |

---

## How to work with the developer

- **Language:** Always respond in Spanish. All code, comments, variable names, and documentation must be written in English.
- **Ask before assuming:** If a requirement is ambiguous, ask before implementing. Wrong architecture decisions are expensive to reverse.
- **One concern at a time:** When proposing changes, focus on one domain slice or one layer. Do not refactor across multiple slices in a single response.
- **Explain violations:** If you identify an architecture violation in existing code, flag it explicitly before suggesting a fix.
- **No premature abstraction:** Do not introduce new patterns, packages, or abstractions that are not already in the stack without flagging it and explaining why.
- **Respect locked decisions:** The decisions listed above are final for v1. Do not propose alternatives unless the developer explicitly opens the discussion.
- **Tests matter:** Any new use case or repository method should have a corresponding unit or integration test. Do not skip tests.

---

## Useful commands

```bash
# Development
bun run dev                        # start development server → http://localhost:3000
bun run build                      # production build
bun run lint                       # ESLint
bun run format                     # Prettier

# Tests
bun run test                       # Vitest: unit + integration
bun run test:e2e                   # Playwright: end-to-end
bun run test -- --reporter=verbose # verbose test output

# Database
bun run db:generate                # regenerate Prisma client after schema changes
bun run db:migrate                 # create a new migration (dev only)
bun run db:push                    # push schema without migration (prototyping only — never against shared DB)
bun run db:studio                  # open Prisma Studio in the browser
bun run db:seed                    # seed development data

# Supabase
bunx supabase db push              # apply RLS + trigger SQL migrations
bunx supabase db diff              # diff local schema against remote
bunx supabase gen types typescript --linked > shared/supabase/types.ts  # regenerate DB types
```

---

## Runbooks (incident guides)

If something goes wrong during a live brigade, the runbooks in `docs/runbooks/` cover the most common incidents:

| Incident                             | Dev guide                                                                                      | Staff guide (ES)                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Dashboard loses WebSocket connection | [`docs/runbooks/01-websocket-disconnection.md`](./docs/runbooks/01-websocket-disconnection.md) | [`docs/runbooks/es/01-desconexion-websocket.md`](./docs/runbooks/es/01-desconexion-websocket.md) |
| Queue stuck / turno won't advance    | [`docs/runbooks/02-queue-stuck.md`](./docs/runbooks/02-queue-stuck.md)                         | [`docs/runbooks/es/02-cola-trabada.md`](./docs/runbooks/es/02-cola-trabada.md)                   |
| Patient registered twice             | [`docs/runbooks/03-patient-duplicate.md`](./docs/runbooks/03-patient-duplicate.md)             | [`docs/runbooks/es/03-paciente-duplicado.md`](./docs/runbooks/es/03-paciente-duplicado.md)       |
