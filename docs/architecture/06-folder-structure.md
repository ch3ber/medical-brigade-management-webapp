# 06 — Folder Structure

## Architecture approach

The project applies three complementary patterns inside a single Next.js application:

**Clean Architecture** — code is organized in concentric layers. Inner layers (domain, application) have zero knowledge of outer layers (infrastructure, framework). Dependencies always point inward.

**Screaming Architecture** — the top-level folder names shout what the system does, not what framework it uses. Opening `src/` you see `brigades/`, `patients/`, `turnos/`, `areas/`, `members/` — the business, not the technology.

**Vertical Slicing** — each domain is a self-contained vertical slice with its own domain, application, and infrastructure layers. You work inside one slice at a time, not across horizontal layers.

### Layer responsibilities

| Layer             | What lives here                                                                                                   | Depends on                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `domain/`         | Entities, value objects, repository interfaces, domain events. Pure TypeScript — no frameworks, no ORMs, no HTTP. | Nothing                    |
| `application/`    | Use cases. Orchestrates domain objects. Defines what the system can do.                                           | `domain/` only             |
| `infrastructure/` | Concrete implementations: Prisma repositories, Supabase clients, API route handlers, React components, hooks.     | `domain/` + `application/` |

### Why not a monorepo yet

A Turborepo monorepo is justified when two or more apps share code. Today there is one app. The mobile app is a future plan, not a current reality. When the mobile app is being built, migrating to a monorepo is mechanical — move shared folders to `packages/`, update imports, done. Adding that complexity now would slow down v1 with no benefit.

---

## Project root

```
medical-brigade-management-webapp/
├── app/                            ← Next.js App Router (infrastructure entry points)
├── src/                            ← Domain slices (screaming architecture)
├── shared/                         ← Cross-cutting infrastructure (Supabase, realtime)
├── components/                     ← Layout and shell components (not domain-specific)
├── architecture/                   ← You are here
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── supabase/
│   ├── migrations/                 ← RLS policies, triggers, indexes (SQL)
│   └── seed.ts
├── public/
├── middleware.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## `app/` — Next.js App Router

Pages and API routes are infrastructure. They are thin entry points that call use cases from `src/` and return responses. No business logic lives here.

```
app/
├── layout.tsx                      ← Root layout (providers, fonts)
├── page.tsx                        ← Landing page
│
├── (auth)/                         ← Route group: no shared layout
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── invite/
│       └── [token]/
│           └── page.tsx            ← Staff invite acceptance
│
├── (dashboard)/                    ← Route group: requires session
│   ├── layout.tsx                  ← Sidebar + top nav shell
│   ├── page.tsx                    ← Director home: brigade list
│   └── brigades/
│       ├── new/
│       │   └── page.tsx
│       └── [brigadeId]/
│           ├── layout.tsx          ← Brigade context provider
│           ├── page.tsx            ← Brigade overview (director dashboard)
│           ├── settings/
│           │   └── page.tsx        ← Areas, members, access config
│           ├── patients/
│           │   ├── page.tsx
│           │   └── new/
│           │       └── page.tsx    ← Register patient + assign areas
│           └── areas/
│               └── [areaId]/
│                   └── page.tsx    ← Area queue dashboard
│
├── (public)/                       ← Route group: no auth required
│   └── dashboard/
│       └── [brigadeId]/
│           └── [areaId]/
│               └── page.tsx        ← Public turno display (no patient names)
│
└── api/                            ← API Route Handlers (serverless on Vercel)
    └── v1/                         ← API version prefix (all routes live here)
        ├── brigades/
        │   └── [brigadeId]/
        │       ├── route.ts                              ← GET, PATCH brigade
        │       ├── open/
        │       │   └── route.ts                          ← POST open brigade
        │       ├── close/
        │       │   └── route.ts                          ← POST close brigade
        │       ├── clone/
        │       │   └── route.ts                          ← POST clone brigade
        │       ├── areas/
        │       │   ├── route.ts                          ← GET areas, POST create area
        │       │   └── [areaId]/
        │       │       ├── route.ts                      ← PATCH, DELETE area
        │       │       ├── clone/
        │       │       │   └── route.ts                  ← POST clone area
        │       │       ├── next/
        │       │       │   └── route.ts                  ← POST advance queue
        │       │       └── turnos/
        │       │           └── [turnoId]/
        │       │               ├── call/
        │       │               │   └── route.ts          ← POST call specific turno
        │       │               ├── move/
        │       │               │   └── route.ts          ← POST move to tail
        │       │               └── remove/
        │       │                   └── route.ts          ← POST remove from queue
        │       ├── patients/
        │       │   ├── route.ts                          ← GET patients, POST register
        │       │   └── [patientId]/
        │       │       ├── route.ts                      ← GET patient detail
        │       │       └── areas/
        │       │           └── route.ts                  ← POST add patient to area
        │       └── members/
        │           ├── route.ts                          ← GET members, POST invite
        │           └── [memberId]/
        │               └── route.ts                      ← PATCH, DELETE member
        └── public/
            └── [brigadeId]/
                └── areas/
                    └── [areaId]/
                        └── route.ts                      ← GET public area dashboard
```

---

## `src/` — Domain slices

Each domain slice is fully self-contained. All layers for a given domain live together.

```
src/
│
├── brigades/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Brigade.ts              ← Brigade entity + business rules
│   │   ├── value-objects/
│   │   │   ├── BrigadeStatus.ts        ← DRAFT → ACTIVE → CLOSED transitions
│   │   │   └── BrigadeLocation.ts
│   │   ├── repositories/
│   │   │   └── IBrigadeRepository.ts   ← Interface only, no implementation
│   │   └── events/
│   │       ├── BrigadeOpened.ts
│   │       └── BrigadeClosed.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── create-brigade.ts
│   │       ├── open-brigade.ts
│   │       ├── close-brigade.ts
│   │       ├── clone-brigade.ts
│   │       └── get-brigade-overview.ts
│   └── infrastructure/
│       ├── prisma-brigade-repository.ts  ← Implements IBrigadeRepository with Prisma
│       └── components/
│           ├── BrigadeCard.tsx
│           ├── BrigadeStatusBadge.tsx
│           └── BrigadeCloneDialog.tsx
│
├── areas/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Area.ts                 ← Area entity, patientLimit enforcement
│   │   ├── value-objects/
│   │   │   ├── AreaPrefix.ts           ← Max 4 chars, uppercase validation
│   │   │   └── AreaColor.ts            ← Hex color validation
│   │   ├── repositories/
│   │   │   └── IAreaRepository.ts
│   │   └── events/
│   │       └── AreaLimitReached.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── create-area.ts
│   │       ├── update-area.ts
│   │       ├── delete-area.ts
│   │       └── clone-area.ts
│   └── infrastructure/
│       ├── prisma-area-repository.ts
│       └── components/
│           ├── AreaForm.tsx
│           ├── AreaColorPicker.tsx
│           └── AreaLimitBadge.tsx
│
├── patients/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Patient.ts              ← Patient entity, globalOrder logic
│   │   ├── value-objects/
│   │   │   ├── PatientAge.ts
│   │   │   ├── PatientPhone.ts
│   │   │   └── ChurchVisitPreference.ts
│   │   ├── repositories/
│   │   │   └── IPatientRepository.ts
│   │   └── events/
│   │       └── PatientRegistered.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── register-patient.ts     ← Creates patient + all initial turnos atomically
│   │       ├── add-patient-to-area.ts  ← Adds turno for additional area post-registration
│   │       └── get-patient-detail.ts
│   └── infrastructure/
│       ├── prisma-patient-repository.ts
│       └── components/
│           ├── PatientForm.tsx
│           ├── PatientList.tsx
│           └── PatientAreaHistory.tsx
│
├── turnos/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Turno.ts                ← Turno entity, valid status transitions
│   │   ├── value-objects/
│   │   │   ├── TurnoStatus.ts          ← WAITING→CALLED→SERVED / MOVED / REMOVED
│   │   │   ├── TurnoLabel.ts           ← formatLabel(prefix, areaOrder) → "D-12"
│   │   │   └── AreaOrder.ts            ← Sequential counter, always positive integer
│   │   ├── repositories/
│   │   │   └── ITurnoRepository.ts
│   │   └── events/
│   │       ├── TurnoCalled.ts
│   │       ├── TurnoServed.ts
│   │       ├── TurnoMoved.ts
│   │       └── TurnoRemoved.ts
│   ├── application/
│   │   └── use-cases/
│   │       ├── call-next-turno.ts      ← Advances queue in strict order
│   │       ├── call-specific-turno.ts  ← Calls any WAITING turno out of order
│   │       ├── move-turno-to-tail.ts   ← Patient not present, rejoin queue tail
│   │       └── remove-turno.ts         ← Permanently removes from queue
│   └── infrastructure/
│       ├── prisma-turno-repository.ts
│       └── components/
│           ├── AreaDashboard.tsx
│           ├── PublicAreaDashboard.tsx
│           ├── CurrentTurnoDisplay.tsx
│           ├── WaitingQueue.tsx
│           ├── ServedList.tsx
│           ├── QueueActionBar.tsx
│           └── ConnectionStatusBanner.tsx
│
└── members/
    ├── domain/
    │   ├── entities/
    │   │   └── BrigadeMember.ts        ← Member entity, role rules
    │   ├── value-objects/
    │   │   ├── BrigadeRole.ts          ← DIRECTOR / CO_DIRECTOR / STAFF
    │   │   └── InviteToken.ts          ← UUID token
    │   ├── repositories/
    │   │   └── IMemberRepository.ts
    │   └── events/
    │       ├── MemberInvited.ts
    │       └── MemberAcceptedInvite.ts
    ├── application/
    │   └── use-cases/
    │       ├── invite-member.ts
    │       ├── generate-staff-credentials.ts
    │       ├── accept-invite.ts
    │       ├── update-member-role.ts
    │       └── remove-member.ts
    └── infrastructure/
        ├── prisma-member-repository.ts
        └── components/
            ├── MemberList.tsx
            └── InviteMemberDialog.tsx
```

---

## `shared/` — Cross-cutting infrastructure

Utilities that are not owned by any single domain slice.

```
shared/
├── supabase/
│   ├── client.ts               ← Browser Supabase client (singleton)
│   ├── server.ts               ← Server Supabase client (cookies, server components)
│   └── admin.ts                ← Service role client (server-only, never sent to browser)
├── realtime/
│   ├── use-area-queue.ts       ← Realtime subscription hook: area dashboard
│   └── use-brigade-overview.ts ← Realtime subscription hook: director overview
├── prisma/
│   └── client.ts               ← Prisma client singleton
└── lib/
    └── cn.ts                   ← clsx + tailwind-merge utility
```

---

## `components/` — Shell and layout components

Non-domain UI components that belong to the app shell, not to any domain slice.

```
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── TopNav.tsx
│   └── BrigadeContextHeader.tsx
└── ui/                         ← shadcn/ui primitives (copied, not a dependency)
    ├── button.tsx
    ├── card.tsx
    ├── dialog.tsx
    ├── input.tsx
    └── ...
```

---

## Dependency rules

```
domain/          →  no imports from anywhere inside the project
application/     →  imports from domain/ only
infrastructure/  →  imports from domain/ + application/ + external packages
app/             →  imports from infrastructure/ only
shared/          →  imports from external packages only (Supabase, Prisma)
```

A repository interface (`ITurnoRepository.ts`) lives in `domain/`. Its Prisma implementation (`prisma-turno-repository.ts`) lives in `infrastructure/`. The use case in `application/` depends only on the interface — never on Prisma directly. Swapping Prisma for another ORM only touches `infrastructure/`.

---

## Naming conventions

| Thing                      | Convention                    | Example                          |
| -------------------------- | ----------------------------- | -------------------------------- |
| React components           | PascalCase                    | `AreaDashboard.tsx`              |
| Domain entities            | PascalCase                    | `Turno.ts`, `Brigade.ts`         |
| Value objects              | PascalCase                    | `TurnoLabel.ts`, `AreaPrefix.ts` |
| Repository interfaces      | PascalCase with `I` prefix    | `ITurnoRepository.ts`            |
| Repository implementations | kebab-case, technology prefix | `prisma-turno-repository.ts`     |
| Use cases                  | kebab-case, verb-noun         | `call-next-turno.ts`             |
| Domain events              | PascalCase, past tense        | `TurnoCalled.ts`                 |
| Hooks                      | kebab-case with `use-` prefix | `use-area-queue.ts`              |
| Utilities                  | kebab-case                    | `cn.ts`                          |
| Test files                 | Same name + `.test.ts`        | `call-next-turno.test.ts`        |
| E2E test files             | kebab-case + `.spec.ts`       | `patient-registration.spec.ts`   |

---

## Tests

Each domain slice owns its tests. Test files live alongside the code they test.

```
src/turnos/
├── domain/
│   └── entities/
│       ├── Turno.ts
│       └── tests/
│           └── unit/
│               └── Turno.test.ts
├── application/
│   └── use-cases/
│       ├── call-next-turno.ts
│       └── tests/
│           ├── unit/
│           │   └── call-next-turno.test.ts
│           └── integration/
│               └── call-next-turno.integration.test.ts
└── infrastructure/
    └── tests/
        └── e2e/
            └── queue-advancement.spec.ts
```

---

## Deployment on Vercel

This is a standard single Next.js app. No special Vercel configuration needed.

```
Vercel (single project)
├── Frontend (SSR / RSC)     → app/(dashboard)/, app/(auth)/, app/(public)/
└── Backend (Serverless)     → app/api/** (each route.ts = one serverless function)
          │
          └── connects to → Supabase (PostgreSQL + Auth + Realtime)
```

All `app/api/` Route Handlers deploy automatically as Vercel Serverless Functions. No separate backend service is required. The only external dependency is Supabase.

### Required environment variables

```bash
# Public — exposed to the browser
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Server only — never sent to the client
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=        # Supabase connection pooler (port 6543) — for Prisma runtime
DIRECT_URL=          # Direct Supabase connection (port 5432) — for Prisma migrations only
```

### Scripts

```bash
bun run dev           # development server
bun run build         # production build
bun run lint          # ESLint
bun run format        # Prettier
bun run test          # Vitest (unit + integration)
bun run test:e2e      # Playwright (end-to-end)
bun run db:generate   # regenerate Prisma client after schema changes
bun run db:migrate    # create a new migration (dev only)
bun run db:push       # push schema without migration (prototyping only)
bun run db:studio     # open Prisma Studio
```
