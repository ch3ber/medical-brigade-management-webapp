# Frontend-Backend Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data with real Supabase + Prisma data, wire all forms with Server Actions, and add route protection via middleware.

**Architecture:** Server Components in `app/` call use cases directly via infrastructure-layer repositories (no internal fetch). Forms use Next.js 14 Server Actions (`'use server'`). Auth uses Supabase Auth via `createSupabaseServerClient()`. Route protection via `middleware.ts`.

**Tech Stack:** Next.js 14 App Router, Supabase Auth (`@supabase/ssr`), Prisma 5, Vitest (globals), `bun` for all commands.

---

## File Map

**New files:**

- `middleware.ts`
- `app/(auth)/actions.ts`
- `app/(dashboard)/dashboard/brigades/actions.ts`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/actions.ts`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/actions.ts`
- `src/brigades/application/use-cases/list-brigades.ts`
- `src/brigades/application/use-cases/create-brigade.ts`
- `src/brigades/application/use-cases/tests/unit/list-brigades.test.ts`
- `src/brigades/application/use-cases/tests/unit/create-brigade.test.ts`
- `src/turnos/application/use-cases/get-authenticated-area-queue.ts`
- `src/turnos/application/use-cases/tests/unit/get-authenticated-area-queue.test.ts`

**Modified files:**

- `src/brigades/domain/entities/Brigade.ts` — add `BrigadeWithCounts`
- `src/brigades/domain/repositories/IBrigadeRepository.ts` — add `findAllByUserId`
- `src/brigades/infrastructure/prisma-brigade-repository.ts` — implement `findAllByUserId`
- `src/turnos/domain/repositories/ITurnoRepository.ts` — add `AuthenticatedAreaQueue` type + `getAuthenticatedAreaQueue`
- `src/turnos/infrastructure/prisma-turno-repository.ts` — implement `getAuthenticatedAreaQueue`
- `src/turnos/infrastructure/components/AreaDashboard.tsx` — remove `MockTurno` dependency
- `src/patients/infrastructure/components/PatientForm.tsx` — accept `brigadeId` + `action` prop
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/brigades/page.tsx`
- `app/(dashboard)/dashboard/brigades/new/page.tsx`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/page.tsx`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/settings/page.tsx`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/page.tsx`
- `app/(dashboard)/dashboard/brigades/[brigadeId]/areas/[areaId]/page.tsx`
- `app/(dashboard)/dashboard/patients/page.tsx`
- `app/(public)/dashboard/[brigadeId]/[areaId]/page.tsx`

**Redirected (legacy pages under `/brigades/*`):**

- `app/(dashboard)/brigades/page.tsx`
- `app/(dashboard)/brigades/[brigadeId]/page.tsx`
- `app/(dashboard)/brigades/[brigadeId]/areas/[areaId]/page.tsx`

---

## Task 1: Middleware — Route Protection

**Files:**

- Create: `middleware.ts`

- [ ] **Step 1: Write the middleware**

```ts
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
```

- [ ] **Step 2: Verify build compiles**

```bash
bun run build 2>&1 | tail -20
```

Expected: no TypeScript errors related to middleware.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add middleware for /dashboard route protection"
```

---

## Task 2: Auth Server Actions — Login and Register

**Files:**

- Create: `app/(auth)/actions.ts`

- [ ] **Step 1: Create auth server actions file**

```ts
// app/(auth)/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

export async function registerAction(formData: FormData) {
  const fullName = formData.get('fullName') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password !== confirmPassword) {
    redirect('/register?error=Las+contraseñas+no+coinciden')
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut({ scope: 'local' })
  redirect('/login')
}
```

- [ ] **Step 2: Wire Login page**

```tsx
// app/(auth)/login/page.tsx
import Link from 'next/link'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <MobileShell>
      <PageHeader
        title="Iniciar sesión"
        backHref="/"
      />
      <main className="flex-1 px-6 pt-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Bienvenido de nuevo</h2>
          <p className="text-sm text-[var(--muted)]">Ingresa para gestionar tu brigada.</p>
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          action={loginAction}
          className="mt-10 space-y-4"
        >
          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Correo electrónico</span>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="email"
                name="email"
                required
                placeholder="tu@brigada.org"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                className="pl-11"
              />
            </div>
          </label>

          <div className="text-right">
            <Link
              href="#"
              className="text-xs font-medium text-[var(--accent)]"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            size="lg"
            className="mt-2 w-full"
            type="submit"
          >
            Ingresar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿Necesitas acceso?{' '}
          <Link
            href="/register"
            className="font-medium text-[var(--accent)]"
          >
            Solicitar invitación
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
```

- [ ] **Step 3: Wire Register page**

```tsx
// app/(auth)/register/page.tsx
import Link from 'next/link'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registerAction } from './actions'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegisterPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <MobileShell>
      <PageHeader
        title="Crear cuenta"
        backHref="/login"
      />
      <main className="flex-1 px-6 pt-6 pb-10">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Únete a tu brigada</h2>
          <p className="text-sm text-[var(--muted)]">Crea una cuenta para gestionar tu brigada.</p>
        </div>

        {error && (
          <div className="mt-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          action={registerAction}
          className="mt-10 space-y-4"
        >
          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Nombre completo</span>
            <div className="relative mt-1">
              <User className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                name="fullName"
                required
                placeholder="María López"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Correo electrónico</span>
            <div className="relative mt-1">
              <Mail className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="email"
                name="email"
                required
                placeholder="tu@brigada.org"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                name="password"
                required
                placeholder="Mínimo 8 caracteres"
                className="pl-11"
              />
            </div>
          </label>

          <label className="block">
            <span className="ml-2 text-xs font-medium text-[var(--muted)]">Confirmar contraseña</span>
            <div className="relative mt-1">
              <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input
                type="password"
                name="confirmPassword"
                required
                placeholder="Repite la contraseña"
                className="pl-11"
              />
            </div>
          </label>

          <Button
            size="lg"
            className="mt-4 w-full"
            type="submit"
          >
            Crear cuenta
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-[var(--accent)]"
          >
            Ingresar
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors in auth pages.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/actions.ts app/\(auth\)/login/page.tsx app/\(auth\)/register/page.tsx
git commit -m "feat(auth): wire login and register forms to Supabase Server Actions"
```

---

## Task 3: BrigadeWithCounts entity + IBrigadeRepository + Prisma impl

**Files:**

- Modify: `src/brigades/domain/entities/Brigade.ts`
- Modify: `src/brigades/domain/repositories/IBrigadeRepository.ts`
- Modify: `src/brigades/infrastructure/prisma-brigade-repository.ts`

- [ ] **Step 1: Write failing test for BrigadeWithCounts**

```ts
// src/brigades/domain/entities/tests/unit/BrigadeWithCounts.test.ts
import { BrigadeWithCounts } from '@/src/brigades/domain/entities/Brigade'

describe('BrigadeWithCounts', () => {
  it('extends Brigade with patientsCount and areasCount', () => {
    const b = new BrigadeWithCounts({
      id: 'b-1',
      name: 'Test',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'u-1',
      createdAt: new Date(),
      patientsCount: 10,
      areasCount: 3,
    })

    expect(b.patientsCount).toBe(10)
    expect(b.areasCount).toBe(3)
    expect(b.id).toBe('b-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/domain/entities/tests/unit/BrigadeWithCounts.test.ts
```

Expected: FAIL with "BrigadeWithCounts is not a constructor" or import error.

- [ ] **Step 3: Add BrigadeWithCounts to Brigade entity**

Add to end of `src/brigades/domain/entities/Brigade.ts`:

```ts
export interface BrigadeWithCountsProps extends BrigadeProps {
  patientsCount: number
  areasCount: number
}

export class BrigadeWithCounts extends Brigade {
  readonly patientsCount: number
  readonly areasCount: number

  constructor(props: BrigadeWithCountsProps) {
    super(props)
    this.patientsCount = props.patientsCount
    this.areasCount = props.areasCount
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/domain/entities/tests/unit/BrigadeWithCounts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add findAllByUserId to IBrigadeRepository**

In `src/brigades/domain/repositories/IBrigadeRepository.ts`, add the import and method:

```ts
import type { Brigade, BrigadeWithCounts, BrigadeStatus } from '../entities/Brigade'

export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface CreateBrigadeData {
  name: string
  description: string | null
  location: string
  date: Date
  createdBy: string
  creatorEmail: string
}

export interface UpdateBrigadeData {
  name?: string
  description?: string | null
  location?: string
  date?: Date
  status?: BrigadeStatus
  openedAt?: Date | null
  closedAt?: Date | null
}

export interface IBrigadeRepository {
  findById(id: string, userId: string): Promise<Brigade | null>
  findAllByUserId(userId: string): Promise<BrigadeWithCounts[]>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  create(data: CreateBrigadeData): Promise<Brigade>
  update(id: string, data: UpdateBrigadeData): Promise<Brigade>
}
```

- [ ] **Step 6: Implement findAllByUserId in PrismaBrigadeRepository**

In `src/brigades/infrastructure/prisma-brigade-repository.ts`, add the import and method.

First, add `BrigadeWithCounts` to the import at the top of the file:

```ts
import { Brigade, BrigadeWithCounts } from '../domain/entities/Brigade'
```

Then replace the `toDomain` helper with two helpers and add `findAllByUserId`:

```ts
type PrismaRow = {
  id: string
  name: string
  description: string | null
  location: string
  date: Date
  status: PrismaBrigadeStatus
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

function toDomainProps(row: PrismaRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    date: row.date,
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

function toDomain(row: PrismaRow): Brigade {
  return new Brigade(toDomainProps(row))
}
```

Then add the `findAllByUserId` method to `PrismaBrigadeRepository`:

```ts
async findAllByUserId(userId: string): Promise<BrigadeWithCounts[]> {
  const rows = await this.prisma.brigade.findMany({
    where: {
      members: { some: { profileId: userId } },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          patients: true,
          areas: { where: { isActive: true } },
        },
      },
    },
  })

  return rows.map(
    (row) =>
      new BrigadeWithCounts({
        ...toDomainProps(row),
        patientsCount: row._count.patients,
        areasCount: row._count.areas,
      }),
  )
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors in brigades domain files.

- [ ] **Step 8: Commit**

```bash
git add src/brigades/domain/entities/Brigade.ts \
        src/brigades/domain/entities/tests/unit/BrigadeWithCounts.test.ts \
        src/brigades/domain/repositories/IBrigadeRepository.ts \
        src/brigades/infrastructure/prisma-brigade-repository.ts
git commit -m "feat(brigades): add BrigadeWithCounts entity and findAllByUserId to repository"
```

---

## Task 4: ListBrigadesUseCase + tests

**Files:**

- Create: `src/brigades/application/use-cases/list-brigades.ts`
- Create: `src/brigades/application/use-cases/tests/unit/list-brigades.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/brigades/application/use-cases/tests/unit/list-brigades.test.ts
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { BrigadeWithCounts } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAllByUserId: vi.fn().mockResolvedValue([]),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigadeWithCounts() {
  return new BrigadeWithCounts({
    id: 'b-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-25'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
    patientsCount: 0,
    areasCount: 0,
  })
}

describe('ListBrigadesUseCase', () => {
  it('returns all brigades for a user', async () => {
    const brigades = [makeBrigadeWithCounts()]
    const repo = makeMockRepo({ findAllByUserId: vi.fn().mockResolvedValue(brigades) })

    const result = await new ListBrigadesUseCase(repo).execute({ userId: 'user-1' })

    expect(result).toBe(brigades)
    expect(repo.findAllByUserId).toHaveBeenCalledWith('user-1')
  })

  it('returns empty array when user has no brigades', async () => {
    const repo = makeMockRepo({ findAllByUserId: vi.fn().mockResolvedValue([]) })

    const result = await new ListBrigadesUseCase(repo).execute({ userId: 'user-1' })

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/list-brigades.test.ts
```

Expected: FAIL with import error.

- [ ] **Step 3: Implement ListBrigadesUseCase**

```ts
// src/brigades/application/use-cases/list-brigades.ts
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'
import type { BrigadeWithCounts } from '../../domain/entities/Brigade'

interface ListBrigadesDto {
  userId: string
}

export class ListBrigadesUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ userId }: ListBrigadesDto): Promise<BrigadeWithCounts[]> {
    return this.repo.findAllByUserId(userId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/list-brigades.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/list-brigades.ts \
        src/brigades/application/use-cases/tests/unit/list-brigades.test.ts
git commit -m "feat(brigades): add ListBrigadesUseCase"
```

---

## Task 5: CreateBrigadeUseCase + tests

**Files:**

- Create: `src/brigades/application/use-cases/create-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/create-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/brigades/application/use-cases/tests/unit/create-brigade.test.ts
import { CreateBrigadeUseCase } from '@/src/brigades/application/use-cases/create-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAllByUserId: vi.fn().mockResolvedValue([]),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade() {
  return new Brigade({
    id: 'b-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-25'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CreateBrigadeUseCase', () => {
  it('creates a brigade and returns it', async () => {
    const brigade = makeBrigade()
    const repo = makeMockRepo({ create: vi.fn().mockResolvedValue(brigade) })

    const result = await new CreateBrigadeUseCase(repo).execute({
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      createdBy: 'user-1',
      creatorEmail: 'user@test.com',
    })

    expect(result).toBe(brigade)
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      createdBy: 'user-1',
      creatorEmail: 'user@test.com',
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/create-brigade.test.ts
```

Expected: FAIL with import error.

- [ ] **Step 3: Implement CreateBrigadeUseCase**

```ts
// src/brigades/application/use-cases/create-brigade.ts
import type { IBrigadeRepository, CreateBrigadeData } from '../../domain/repositories/IBrigadeRepository'
import type { Brigade } from '../../domain/entities/Brigade'

export class CreateBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute(data: CreateBrigadeData): Promise<Brigade> {
    return this.repo.create(data)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/create-brigade.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/create-brigade.ts \
        src/brigades/application/use-cases/tests/unit/create-brigade.test.ts
git commit -m "feat(brigades): add CreateBrigadeUseCase"
```

---

## Task 6: AuthenticatedAreaQueue — ITurnoRepository + Prisma + UseCase + tests

**Files:**

- Modify: `src/turnos/domain/repositories/ITurnoRepository.ts`
- Modify: `src/turnos/infrastructure/prisma-turno-repository.ts`
- Create: `src/turnos/application/use-cases/get-authenticated-area-queue.ts`
- Create: `src/turnos/application/use-cases/tests/unit/get-authenticated-area-queue.test.ts`

- [ ] **Step 1: Add AuthenticatedAreaQueue type to ITurnoRepository**

Add to `src/turnos/domain/repositories/ITurnoRepository.ts`:

```ts
export interface AuthQueueCalledTurno {
  id: string
  label: string
  patientName: string
  age: number
}

export interface AuthQueueWaitingTurno {
  id: string
  label: string
  patientName: string
  age: number
}

export interface AuthQueueServedTurno {
  id: string
  label: string
  patientName: string
}

export interface AuthenticatedAreaQueue {
  area: { id: string; nombre: string; prefijo: string; color: string }
  turnoActual: AuthQueueCalledTurno | null
  enEspera: AuthQueueWaitingTurno[]
  atendidos: AuthQueueServedTurno[]
}
```

Also add `getAuthenticatedAreaQueue` to the `ITurnoRepository` interface:

```ts
getAuthenticatedAreaQueue(brigadeId: string, areaId: string, userId: string): Promise<AuthenticatedAreaQueue | null>
```

- [ ] **Step 2: Implement getAuthenticatedAreaQueue in PrismaTurnoRepository**

Add to `src/turnos/infrastructure/prisma-turno-repository.ts` at the end of the class body. First add the import at the top:

```ts
import type {
  ITurnoRepository,
  BrigadeRole,
  NextTurnoResult,
  MoveResult,
  RemoveResult,
  PublicAreaQueue,
  AuthenticatedAreaQueue,
} from '../domain/repositories/ITurnoRepository'
```

Then add the method:

```ts
async getAuthenticatedAreaQueue(
  brigadeId: string,
  areaId: string,
  userId: string,
): Promise<AuthenticatedAreaQueue | null> {
  const role = await this.getMemberRole(brigadeId, userId)
  if (!role) return null

  const area = await this.prisma.area.findFirst({
    where: { id: areaId, brigadeId },
    select: { id: true, name: true, prefix: true, color: true },
  })
  if (!area) return null

  const [called, waiting, served] = await Promise.all([
    this.prisma.turno.findFirst({
      where: { areaId, brigadeId, status: TurnoStatus.CALLED },
      include: { patient: { select: { fullName: true, age: true } } },
    }),
    this.prisma.turno.findMany({
      where: { areaId, brigadeId, status: TurnoStatus.WAITING },
      orderBy: { areaOrder: 'asc' },
      include: { patient: { select: { fullName: true, age: true } } },
    }),
    this.prisma.turno.findMany({
      where: { areaId, brigadeId, status: TurnoStatus.SERVED },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: { patient: { select: { fullName: true } } },
    }),
  ])

  return {
    area: { id: area.id, nombre: area.name, prefijo: area.prefix, color: area.color },
    turnoActual: called
      ? {
          id: called.id,
          label: `${area.prefix}-${called.areaOrder}`,
          patientName: called.patient.fullName,
          age: called.patient.age,
        }
      : null,
    enEspera: waiting.map((t) => ({
      id: t.id,
      label: `${area.prefix}-${t.areaOrder}`,
      patientName: t.patient.fullName,
      age: t.patient.age,
    })),
    atendidos: served.map((t) => ({
      id: t.id,
      label: `${area.prefix}-${t.areaOrder}`,
      patientName: t.patient.fullName,
    })),
  }
}
```

- [ ] **Step 3: Write the failing use case test**

```ts
// src/turnos/application/use-cases/tests/unit/get-authenticated-area-queue.test.ts
import { GetAuthenticatedAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-authenticated-area-queue'
import type {
  ITurnoRepository,
  AuthenticatedAreaQueue,
} from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn(),
    callSpecific: vi.fn(),
    moveToTail: vi.fn(),
    remove: vi.fn(),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const mockQueue: AuthenticatedAreaQueue = {
  area: { id: 'area-1', nombre: 'Dental', prefijo: 'D', color: '#4F86C6' },
  turnoActual: { id: 't-1', label: 'D-5', patientName: 'María García', age: 35 },
  enEspera: [{ id: 't-2', label: 'D-6', patientName: 'Juan Pérez', age: 40 }],
  atendidos: [{ id: 't-0', label: 'D-4', patientName: 'Ana Torres' }],
}

describe('GetAuthenticatedAreaQueueUseCase', () => {
  it('returns queue when user has access', async () => {
    const repo = makeMockRepo({
      getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(mockQueue),
    })

    const result = await new GetAuthenticatedAreaQueueUseCase(repo).execute({
      brigadeId: 'brigade-1',
      areaId: 'area-1',
      userId: 'user-1',
    })

    expect(result).toBe(mockQueue)
    expect(repo.getAuthenticatedAreaQueue).toHaveBeenCalledWith('brigade-1', 'area-1', 'user-1')
  })

  it('throws AREA_NO_ENCONTRADA when area not found or no access', async () => {
    const repo = makeMockRepo({
      getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(null),
    })

    await expect(
      new GetAuthenticatedAreaQueueUseCase(repo).execute({
        brigadeId: 'brigade-1',
        areaId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('AREA_NO_ENCONTRADA')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/get-authenticated-area-queue.test.ts
```

Expected: FAIL with import error.

- [ ] **Step 5: Implement GetAuthenticatedAreaQueueUseCase**

```ts
// src/turnos/application/use-cases/get-authenticated-area-queue.ts
import type { ITurnoRepository, AuthenticatedAreaQueue } from '../../domain/repositories/ITurnoRepository'

interface GetAuthenticatedAreaQueueDto {
  brigadeId: string
  areaId: string
  userId: string
}

export class GetAuthenticatedAreaQueueUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({
    brigadeId,
    areaId,
    userId,
  }: GetAuthenticatedAreaQueueDto): Promise<AuthenticatedAreaQueue> {
    const queue = await this.repo.getAuthenticatedAreaQueue(brigadeId, areaId, userId)
    if (!queue) throw new Error('AREA_NO_ENCONTRADA')
    return queue
  }
}
```

- [ ] **Step 6: Run all turno tests**

```bash
bun run test src/turnos/
```

Expected: all PASS including the new test.

- [ ] **Step 7: Commit**

```bash
git add src/turnos/domain/repositories/ITurnoRepository.ts \
        src/turnos/infrastructure/prisma-turno-repository.ts \
        src/turnos/application/use-cases/get-authenticated-area-queue.ts \
        src/turnos/application/use-cases/tests/unit/get-authenticated-area-queue.test.ts
git commit -m "feat(turnos): add GetAuthenticatedAreaQueueUseCase"
```

---

## Task 7: Refactor AreaDashboard — remove MockTurno dependency

**Files:**

- Modify: `src/turnos/infrastructure/components/AreaDashboard.tsx`

- [ ] **Step 1: Replace AreaDashboard props with real types**

```tsx
// src/turnos/infrastructure/components/AreaDashboard.tsx
import { CurrentTurnoDisplay } from './CurrentTurnoDisplay'
import { WaitingQueue } from './WaitingQueue'
import { ServedList } from './ServedList'
import type { AuthenticatedAreaQueue } from '@/src/turnos/domain/repositories/ITurnoRepository'

export type { AuthenticatedAreaQueue }

interface AreaDashboardProps {
  queue: AuthenticatedAreaQueue
}

export function AreaDashboard({ queue }: AreaDashboardProps) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--muted)]">Área</p>
        <h2 className="text-xl font-bold">{queue.area.nombre}</h2>
      </div>
      <CurrentTurnoDisplay
        label={queue.turnoActual?.label}
        patientName={queue.turnoActual?.patientName}
        age={queue.turnoActual?.age}
      />
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">En espera</h3>
          <span className="text-xs text-[var(--muted)]">{queue.enEspera.length} personas</span>
        </div>
        <WaitingQueue items={queue.enEspera} />
      </section>
      {queue.atendidos.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Atendidos recientemente</h3>
          <ServedList items={queue.atendidos} />
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TS errors in AreaDashboard.

- [ ] **Step 3: Commit**

```bash
git add src/turnos/infrastructure/components/AreaDashboard.tsx
git commit -m "refactor(turnos): remove MockTurno dependency from AreaDashboard"
```

---

## Task 8: Wire Dashboard Home page

**Files:**

- Modify: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Replace mock data with real data**

```tsx
// app/(dashboard)/dashboard/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, ArrowUpRight, Stethoscope, Baby, Pill, Heart, Cross } from 'lucide-react'
import { TopGreeting } from '@/components/layout/TopGreeting'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BrigadeCard } from '@/src/brigades/infrastructure/components/BrigadeCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'

const specialties = [
  { label: 'General', icon: Stethoscope, color: '#4b6bfb' },
  { label: 'Odontología', icon: Cross, color: '#16a34a' },
  { label: 'Pediatría', icon: Baby, color: '#f59e0b' },
  { label: 'Farmacia', icon: Pill, color: '#8b5cf6' },
  { label: 'Cardio', icon: Heart, color: '#ef4444' },
]

export default async function DashboardHomePage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigades, profile] = await Promise.all([
    new ListBrigadesUseCase(new PrismaBrigadeRepository(prisma)).execute({ userId: user.id }),
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true } }),
  ])

  const active = brigades.find((b) => b.status === 'ACTIVE')
  const others = brigades.filter((b) => b.id !== active?.id)

  const firstName = profile?.fullName?.split(' ')[0] ?? 'Usuario'

  return (
    <>
      <TopGreeting
        name={firstName}
        subtitle="¿Listo para la brigada de hoy?"
      />

      <section className="px-5 pt-5">
        <div className="no-scrollbar flex gap-4 overflow-x-auto">
          {specialties.map(({ label, icon: Icon, color }) => (
            <button
              key={label}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface)] ring-1 ring-[var(--border)]"
                style={{ color }}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <section className="px-5 pt-6">
          <Card className="relative overflow-hidden border-0 p-0 text-white">
            <div className="bg-brand-gradient absolute inset-0" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            <div className="relative p-5">
              <div className="flex items-center justify-between">
                <Badge className="border-0 bg-white/20 text-white">Brigada activa</Badge>
                <Link
                  href={`/dashboard/brigades/${active.id}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                  aria-label="Abrir"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
              <h2 className="mt-4 text-xl font-bold">{active.name}</h2>
              <p className="mt-1 text-sm text-white/80">
                {active.location} ·{' '}
                {active.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-[var(--radius-md)] bg-white/15 px-3 py-2 backdrop-blur">
                  <p className="text-[10px] tracking-wide text-white/70 uppercase">Pacientes</p>
                  <p className="font-semibold">{active.patientsCount}</p>
                </div>
                <div className="rounded-[var(--radius-md)] bg-white/15 px-3 py-2 backdrop-blur">
                  <p className="text-[10px] tracking-wide text-white/70 uppercase">Áreas</p>
                  <p className="font-semibold">{active.areasCount}</p>
                </div>
              </div>
              <Link
                href={`/dashboard/brigades/${active.id}/patients/new`}
                className="mt-5 block"
              >
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full border-0 bg-white text-[var(--accent)]"
                >
                  <Plus className="h-4 w-4" />
                  Registrar paciente
                </Button>
              </Link>
            </div>
          </Card>
        </section>
      )}

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Brigadas recientes</h3>
          <Link
            href="/dashboard/brigades"
            className="text-xs font-medium text-[var(--accent)]"
          >
            Ver todas
          </Link>
        </div>
        <div className="mt-3 space-y-3">
          {others.map((b) => (
            <BrigadeCard
              key={b.id}
              id={b.id}
              name={b.name}
              location={b.location}
              date={b.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
              status={b.status}
              patientsCount={b.patientsCount}
              areasCount={b.areasCount}
            />
          ))}
          {others.length === 0 && <p className="text-sm text-[var(--muted)]">No hay brigadas recientes.</p>}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(dashboard): wire home page to real brigade data"
```

---

## Task 9: Wire Brigades List page

**Files:**

- Modify: `app/(dashboard)/dashboard/brigades/page.tsx`

- [ ] **Step 1: Replace mock data**

```tsx
// app/(dashboard)/dashboard/brigades/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Search, Filter } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { BrigadeCard } from '@/src/brigades/infrastructure/components/BrigadeCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'

export default async function BrigadeListPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigades = await new ListBrigadesUseCase(new PrismaBrigadeRepository(prisma)).execute({
    userId: user.id,
  })

  return (
    <>
      <PageHeader
        title="Brigadas"
        backHref="/dashboard"
        right={
          <Link
            href="/dashboard/brigades/new"
            className="bg-brand-gradient inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-[0_10px_30px_-10px_rgb(75_107_251/0.6)]"
            aria-label="Nueva brigada"
          >
            <Plus className="h-4 w-4" />
          </Link>
        }
      />
      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              placeholder="Buscar brigadas"
              className="pl-11"
            />
          </div>
          <button
            className="bg-brand-gradient inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
            aria-label="Filtrar"
          >
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5 pt-5">
        {['Todas', 'Activas', 'Borrador', 'Cerradas'].map((label, i) => (
          <button
            key={label}
            className={
              'shrink-0 rounded-full px-4 py-2 text-xs font-medium ' +
              (i === 0
                ? 'bg-brand-gradient text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]')
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-5 pt-5">
        {brigades.map((b) => (
          <BrigadeCard
            key={b.id}
            id={b.id}
            name={b.name}
            location={b.location}
            date={b.date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            status={b.status}
            patientsCount={b.patientsCount}
            areasCount={b.areasCount}
          />
        ))}
        {brigades.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">
            No tienes brigadas todavía.{' '}
            <Link
              href="/dashboard/brigades/new"
              className="font-medium text-[var(--accent)]"
            >
              Crea una
            </Link>
          </p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/page.tsx
git commit -m "feat(brigades): wire brigades list page to real data"
```

---

## Task 10: Wire Brigade Detail page

**Files:**

- Modify: `app/(dashboard)/dashboard/brigades/[brigadeId]/page.tsx`

- [ ] **Step 1: Replace mock data**

```tsx
// app/(dashboard)/dashboard/brigades/[brigadeId]/page.tsx
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Heart, Share2, MapPin, Calendar, Users, Plus, UserPlus, Settings } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BrigadeStatusBadge } from '@/src/brigades/infrastructure/components/BrigadeStatusBadge'
import { AreaCard } from '@/src/areas/infrastructure/components/AreaCard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function BrigadeDetailPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigadeRepo = new PrismaBrigadeRepository(prisma)
  const areaRepo = new PrismaAreaRepository(prisma)

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(brigadeRepo).execute({ brigadeId, userId: user.id }).catch(() => null),
    new ListAreasUseCase(areaRepo).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const totalWaiting = areas.reduce((acc, a) => acc + a.totalEnEspera, 0)

  return (
    <>
      <PageHeader
        title="Brigada"
        backHref="/dashboard/brigades"
        right={
          <div className="flex gap-2">
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Favorito"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] transition hover:bg-[var(--surface-muted)]"
              aria-label="Compartir"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <section className="px-5 pt-2">
        <Card className="relative overflow-hidden border-0 p-0 text-white">
          <div className="bg-brand-gradient absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
          <div className="relative p-6">
            <BrigadeStatusBadge status={brigade.status} />
            <h1 className="mt-3 text-2xl font-bold">{brigade.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {brigade.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {brigade.date.toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-2 px-5 pt-4">
        <StatTile
          label="Áreas"
          value={areas.length}
          icon={<Calendar className="h-3 w-3" />}
        />
        <StatTile
          label="Esperando"
          value={totalWaiting}
          icon={<Users className="h-3 w-3" />}
        />
        <StatTile
          label="Atendidos"
          value={areas.reduce((acc, a) => acc + a.totalAtendidos, 0)}
          icon={<Users className="h-3 w-3" />}
        />
      </section>

      <section className="flex gap-2 px-5 pt-5">
        <Link
          href={`/dashboard/brigades/${brigadeId}/patients/new`}
          className="flex-1"
        >
          <Button
            size="md"
            className="w-full"
          >
            <UserPlus className="h-4 w-4" />
            Registrar paciente
          </Button>
        </Link>
        <Link href={`/dashboard/brigades/${brigadeId}/settings`}>
          <Button
            size="md"
            variant="secondary"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      <section className="px-5 pt-6 pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Áreas</h3>
          <Link
            href={`/dashboard/brigades/${brigadeId}/settings`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar área
          </Link>
        </div>
        <div className="space-y-3">
          {areas.map((a) => (
            <AreaCard
              key={a.id}
              brigadeId={a.brigadeId}
              id={a.id}
              name={a.name}
              prefix={a.prefix}
              color={a.color}
              waitingCount={a.totalEnEspera}
              servedCount={a.totalAtendidos}
            />
          ))}
          {areas.length === 0 && (
            <p className="py-4 text-center text-sm text-[var(--muted)]">No hay áreas configuradas.</p>
          )}
        </div>
      </section>
    </>
  )
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
      <p className="text-xl font-bold">{value}</p>
      <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-xs text-[var(--muted)]">
        {icon}
        {label}
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/page.tsx
git commit -m "feat(brigades): wire brigade detail page to real data"
```

---

## Task 11: Wire New Brigade page + Server Action

**Files:**

- Create: `app/(dashboard)/dashboard/brigades/actions.ts`
- Modify: `app/(dashboard)/dashboard/brigades/new/page.tsx`

- [ ] **Step 1: Create brigade Server Actions**

```ts
// app/(dashboard)/dashboard/brigades/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { CreateBrigadeUseCase } from '@/src/brigades/application/use-cases/create-brigade'

export async function createBrigadeAction(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const dateStr = formData.get('date') as string
  const areasJson = formData.get('areas') as string

  if (!name || !location || !dateStr) {
    redirect('/dashboard/brigades/new?error=Completa+todos+los+campos+requeridos')
  }

  const areas: { name: string; prefix: string; color: string }[] = JSON.parse(areasJson || '[]')

  const repo = new PrismaBrigadeRepository(prisma)
  const brigade = await new CreateBrigadeUseCase(repo).execute({
    name,
    description: null,
    location,
    date: new Date(dateStr),
    createdBy: user.id,
    creatorEmail: user.email ?? '',
  })

  // Create areas after brigade is created
  if (areas.length > 0) {
    const { PrismaAreaRepository } = await import('@/src/areas/infrastructure/prisma-area-repository')
    const { CreateAreaUseCase } = await import('@/src/areas/application/use-cases/create-area')
    const areaRepo = new PrismaAreaRepository(prisma)
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i]
      if (area.name && area.prefix) {
        await new CreateAreaUseCase(areaRepo).execute({
          brigadeId: brigade.id,
          userId: user.id,
          name: area.name,
          prefix: area.prefix,
          color: area.color,
          patientLimit: null,
          order: i + 1,
        })
      }
    }
  }

  redirect(`/dashboard/brigades/${brigade.id}`)
}
```

- [ ] **Step 2: Wire the New Brigade page**

```tsx
// app/(dashboard)/dashboard/brigades/new/page.tsx
'use client'

import { useState } from 'react'
import { MapPin, Calendar, FileText, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/cn'
import { createBrigadeAction } from '../actions'

const COLORS = ['#4b6bfb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

interface AreaDraft {
  id: string
  name: string
  prefix: string
  color: string
}

export default function NewBrigadePage() {
  const [areas, setAreas] = useState<AreaDraft[]>([
    { id: '1', name: 'Medicina General', prefix: 'MG', color: '#4b6bfb' },
  ])

  const addArea = () =>
    setAreas((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', prefix: '', color: COLORS[prev.length % COLORS.length] },
    ])

  const removeArea = (id: string) => setAreas((prev) => prev.filter((a) => a.id !== id))

  const updateArea = (id: string, field: keyof AreaDraft, value: string) =>
    setAreas((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)))

  return (
    <>
      <PageHeader
        title="Nueva brigada"
        backHref="/dashboard/brigades"
      />
      <form
        action={createBrigadeAction}
        className="space-y-5 px-5 pt-2 pb-4"
      >
        <input
          type="hidden"
          name="areas"
          value={JSON.stringify(areas)}
        />

        <Field
          icon={<FileText className="h-4 w-4" />}
          label="Nombre de la brigada"
        >
          <Input
            name="name"
            placeholder="Brigada San Miguel"
            required
          />
        </Field>

        <Field
          icon={<MapPin className="h-4 w-4" />}
          label="Lugar"
        >
          <Input
            name="location"
            placeholder="Parroquia San Miguel"
            required
          />
        </Field>

        <Field
          icon={<Calendar className="h-4 w-4" />}
          label="Fecha"
        >
          <Input
            type="date"
            name="date"
            required
          />
        </Field>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Áreas</h3>
            <button
              type="button"
              onClick={addArea}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar área
            </button>
          </div>

          <div className="space-y-3">
            {areas.map((area) => (
              <Card
                key={area.id}
                className="space-y-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 shrink-0 rounded-[var(--radius-md)] shadow ring-2 ring-white"
                    style={{ background: area.color }}
                  />
                  <div className="grid flex-1 grid-cols-2 gap-2">
                    <Input
                      placeholder="Nombre del área"
                      value={area.name}
                      onChange={(e) => updateArea(area.id, 'name', e.target.value)}
                      className="h-10 text-sm"
                    />
                    <Input
                      placeholder="Prefijo (MG)"
                      value={area.prefix}
                      maxLength={4}
                      onChange={(e) => updateArea(area.id, 'prefix', e.target.value.toUpperCase())}
                      className="h-10 text-sm"
                    />
                  </div>
                  {areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeArea(area.id)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                      aria-label="Eliminar área"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateArea(area.id, 'color', c)}
                      className={cn(
                        'h-6 w-6 rounded-full transition',
                        area.color === c
                          ? 'scale-110 ring-2 ring-[var(--ring)] ring-offset-2'
                          : 'opacity-70 hover:opacity-100',
                      )}
                      style={{ background: c }}
                      aria-label={c}
                    />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>

        <Button
          size="lg"
          className="mt-2 w-full"
          type="submit"
        >
          Crear brigada
        </Button>
      </form>
    </>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  )
}
```

- [ ] **Step 3: Verify CreateAreaUseCase exists**

```bash
cat src/areas/application/use-cases/create-area.ts | head -15
```

Expected: file exists with `CreateAreaUseCase` class.

- [ ] **Step 4: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/actions.ts \
        app/\(dashboard\)/dashboard/brigades/new/page.tsx
git commit -m "feat(brigades): wire new brigade form with createBrigadeAction"
```

---

## Task 12: Wire Brigade Settings page + Server Actions

**Files:**

- Create: `app/(dashboard)/dashboard/brigades/[brigadeId]/actions.ts`
- Modify: `app/(dashboard)/dashboard/brigades/[brigadeId]/settings/page.tsx`

- [ ] **Step 1: Create brigade detail Server Actions**

```ts
// app/(dashboard)/dashboard/brigades/[brigadeId]/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'
import { CreateAreaUseCase } from '@/src/areas/application/use-cases/create-area'
import { UpdateAreaUseCase } from '@/src/areas/application/use-cases/update-area'
import { DeleteAreaUseCase } from '@/src/areas/application/use-cases/delete-area'

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function updateBrigadeAction(brigadeId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const dateStr = formData.get('date') as string

  const repo = new PrismaBrigadeRepository(prisma)
  await new UpdateBrigadeUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    data: {
      ...(name && { name }),
      ...(location && { location }),
      ...(dateStr && { date: new Date(dateStr) }),
    },
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}`)
  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function createAreaAction(brigadeId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const prefix = formData.get('prefix') as string
  const color = formData.get('color') as string

  const repo = new PrismaAreaRepository(prisma)
  await new CreateAreaUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    name,
    prefix,
    color,
    patientLimit: null,
    order: 999,
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function updateAreaAction(brigadeId: string, areaId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const prefix = formData.get('prefix') as string
  const color = formData.get('color') as string

  const repo = new PrismaAreaRepository(prisma)
  await new UpdateAreaUseCase(repo).execute({
    brigadeId,
    areaId,
    userId: user.id,
    data: {
      ...(name && { name }),
      ...(prefix && { prefix }),
      ...(color && { color }),
    },
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function deleteAreaAction(brigadeId: string, areaId: string) {
  const user = await getAuthUser()

  const repo = new PrismaAreaRepository(prisma)
  await new DeleteAreaUseCase(repo).execute({ brigadeId, areaId, userId: user.id })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}
```

- [ ] **Step 2: Check UpdateBrigadeUseCase dto signature**

```bash
cat src/brigades/application/use-cases/update-brigade.ts | head -20
```

Note the exact parameter shape, then adjust the `updateBrigadeAction` call above if needed.

- [ ] **Step 3: Check UpdateAreaUseCase + DeleteAreaUseCase dto signatures**

```bash
cat src/areas/application/use-cases/update-area.ts | head -20
cat src/areas/application/use-cases/delete-area.ts | head -20
```

Note the exact parameter shapes and adjust the actions above if needed.

- [ ] **Step 4: Wire brigade settings page**

```tsx
// app/(dashboard)/dashboard/brigades/[brigadeId]/settings/page.tsx
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { SettingsClient } from './settings-client'
import { updateBrigadeAction } from '../actions'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function BrigadeSettingsPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const updateBrigade = updateBrigadeAction.bind(null, brigadeId)

  return (
    <>
      <PageHeader
        title="Configuración"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />

      <div className="space-y-6 px-5 pt-2 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de la brigada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={updateBrigade}>
              <label className="block">
                <span className="ml-2 text-xs text-[var(--muted)]">Nombre</span>
                <Input
                  name="name"
                  defaultValue={brigade.name}
                  className="mt-1"
                />
              </label>
              <label className="mt-3 block">
                <span className="ml-2 text-xs text-[var(--muted)]">Lugar</span>
                <Input
                  name="location"
                  defaultValue={brigade.location}
                  className="mt-1"
                />
              </label>
              <label className="mt-3 block">
                <span className="ml-2 text-xs text-[var(--muted)]">Fecha</span>
                <Input
                  type="date"
                  name="date"
                  defaultValue={brigade.date.toISOString().split('T')[0]}
                  className="mt-1"
                />
              </label>
              <Button
                size="md"
                className="mt-4 w-full"
                type="submit"
              >
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <SettingsClient
          brigadeId={brigadeId}
          initialAreas={areas.map((a) => ({
            id: a.id,
            name: a.name,
            prefix: a.prefix,
            color: a.color,
          }))}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 5: Create SettingsClient component for areas management**

```tsx
// app/(dashboard)/dashboard/brigades/[brigadeId]/settings-client.tsx
'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { createAreaAction, updateAreaAction, deleteAreaAction } from './actions'

const COLORS = ['#4b6bfb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

interface AreaRow {
  id: string
  name: string
  prefix: string
  color: string
}

interface Props {
  brigadeId: string
  initialAreas: AreaRow[]
}

export function SettingsClient({ brigadeId, initialAreas }: Props) {
  const [adding, setAdding] = useState(false)
  const [newColor, setNewColor] = useState(COLORS[0])

  const createArea = createAreaAction.bind(null, brigadeId)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Áreas</CardTitle>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {initialAreas.map((area) => {
          const updateArea = updateAreaAction.bind(null, brigadeId, area.id)
          const deleteArea = deleteAreaAction.bind(null, brigadeId, area.id)
          return (
            <form
              key={area.id}
              action={updateArea}
              className="flex items-center gap-3"
            >
              <input
                type="hidden"
                name="color"
                value={area.color}
              />
              <div
                className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
                style={{ background: area.color }}
              />
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                <Input
                  name="name"
                  defaultValue={area.name}
                  placeholder="Nombre del área"
                  className="h-10 text-sm"
                />
                <Input
                  name="prefix"
                  defaultValue={area.prefix}
                  placeholder="Prefijo"
                  maxLength={4}
                  className="h-10 text-sm"
                  onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
                />
              </div>
              <button
                type="submit"
                className="hidden"
              />
              <button
                type="button"
                formAction={deleteArea as never}
                onClick={async () => {
                  await deleteArea()
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-500"
                aria-label="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          )
        })}

        {adding && (
          <form
            action={async (fd) => {
              fd.append('color', newColor)
              await createArea(fd)
              setAdding(false)
            }}
            className="flex items-center gap-3"
          >
            <div
              className="h-10 w-10 shrink-0 rounded-[var(--radius-md)]"
              style={{ background: newColor }}
            />
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
              <Input
                name="name"
                placeholder="Nombre del área"
                required
                className="h-10 text-sm"
              />
              <Input
                name="prefix"
                placeholder="Prefijo"
                maxLength={4}
                required
                className="h-10 text-sm"
                onChange={(e) => (e.target.value = e.target.value.toUpperCase())}
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-50 text-xs font-bold text-green-600"
            >
              ✓
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Fix any type errors from the UpdateBrigadeUseCase/UpdateAreaUseCase/DeleteAreaUseCase dto shapes discovered in Step 2-3.

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/actions.ts \
        app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/settings/page.tsx \
        app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/settings-client.tsx
git commit -m "feat(brigades): wire brigade settings page with real data and Server Actions"
```

---

## Task 13: Wire New Patient page + PatientForm refactor

**Files:**

- Create: `app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/actions.ts`
- Modify: `src/patients/infrastructure/components/PatientForm.tsx`
- Modify: `app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/page.tsx`

- [ ] **Step 1: Create register patient Server Action**

```ts
// app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { RegisterPatientUseCase } from '@/src/patients/application/use-cases/register-patient'

export async function registerPatientAction(brigadeId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = formData.get('fullName') as string
  const age = parseInt(formData.get('age') as string, 10)
  const phone = formData.get('phone') as string
  const areaIdsJson = formData.get('areaIds') as string
  const areaIds: string[] = JSON.parse(areaIdsJson || '[]')

  if (!fullName || !age || areaIds.length === 0) {
    redirect(
      `/dashboard/brigades/${brigadeId}/patients/new?error=Completa+nombre,+edad+y+selecciona+al+menos+un+área`,
    )
  }

  const repo = new PrismaPatientRepository(prisma)
  await new RegisterPatientUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    fullName,
    age,
    gender: (formData.get('gender') as string) || 'other',
    phone: phone || '',
    address: (formData.get('address') as string) || '',
    wantsChurchVisit: formData.get('wantsChurchVisit') === 'true',
    areaIds,
  })

  redirect(`/dashboard/brigades/${brigadeId}`)
}
```

- [ ] **Step 2: Refactor PatientForm to accept Server Action**

```tsx
// src/patients/infrastructure/components/PatientForm.tsx
'use client'

import { useState } from 'react'
import { User, Phone, CalendarDays, Stethoscope } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/shared/lib/cn'

export interface PatientFormAreaOption {
  id: string
  name: string
  prefix: string
  color: string
}

interface Props {
  areas: PatientFormAreaOption[]
  action: (formData: FormData) => Promise<void>
}

export function PatientForm({ areas, action }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const handleSubmit = (formData: FormData) => {
    formData.set('areaIds', JSON.stringify(selected))
    return action(formData)
  }

  return (
    <form
      action={handleSubmit}
      className="space-y-5"
    >
      <Field
        icon={<User className="h-4 w-4" />}
        label="Nombre completo"
      >
        <Input
          name="fullName"
          placeholder="María López"
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          icon={<CalendarDays className="h-4 w-4" />}
          label="Edad"
        >
          <Input
            type="number"
            name="age"
            placeholder="42"
            required
            min={0}
            max={130}
          />
        </Field>
        <Field
          icon={<Phone className="h-4 w-4" />}
          label="Teléfono"
        >
          <Input
            type="tel"
            name="phone"
            placeholder="+503 0000 0000"
          />
        </Field>
      </div>

      <div>
        <label className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
          <Stethoscope className="h-3.5 w-3.5" />
          Asignar a áreas
        </label>
        <Card className="mt-2 p-3">
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => {
              const active = selected.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggle(a.id)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition',
                    active
                      ? 'bg-brand-gradient border-transparent text-white'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      active ? 'bg-white/25 text-white' : 'text-white',
                    )}
                    style={{ background: active ? undefined : a.color }}
                  >
                    {a.prefix}
                  </span>
                  {a.name}
                </button>
              )
            })}
          </div>
        </Card>
        <p className="mt-2 ml-2 text-xs text-[var(--muted)]">
          {selected.length} área{selected.length === 1 ? '' : 's'} seleccionada
          {selected.length === 1 ? '' : 's'}
        </p>
      </div>

      <Button
        size="lg"
        className="mt-2 w-full"
        type="submit"
      >
        Registrar y generar turnos
      </Button>
    </form>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="ml-2 inline-flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
```

- [ ] **Step 3: Wire New Patient page**

```tsx
// app/(dashboard)/dashboard/brigades/[brigadeId]/patients/new/page.tsx
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { PatientForm } from '@/src/patients/infrastructure/components/PatientForm'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { registerPatientAction } from './actions'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function NewPatientPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const action = registerPatientAction.bind(null, brigadeId)

  return (
    <>
      <PageHeader
        title="Registrar paciente"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <p className="mb-5 text-sm text-[var(--muted)]">
          Agregando paciente a <span className="font-medium text-[var(--foreground)]">{brigade.name}</span>
        </p>
        <PatientForm
          areas={areas.map((a) => ({ id: a.id, name: a.name, prefix: a.prefix, color: a.color }))}
          action={action}
        />
      </div>
    </>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
bun run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/patients/new/actions.ts \
        src/patients/infrastructure/components/PatientForm.tsx \
        app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/patients/new/page.tsx
git commit -m "feat(patients): wire new patient form with registerPatientAction"
```

---

## Task 14: Wire Authenticated Area Queue pages

**Files:**

- Modify: `app/(dashboard)/dashboard/brigades/[brigadeId]/areas/[areaId]/page.tsx`

Also redirect the duplicate legacy page:

- Modify: `app/(dashboard)/brigades/[brigadeId]/areas/[areaId]/page.tsx`

- [ ] **Step 1: Wire the area queue page**

```tsx
// app/(dashboard)/dashboard/brigades/[brigadeId]/areas/[areaId]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { AreaDashboard } from '@/src/turnos/infrastructure/components/AreaDashboard'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetAuthenticatedAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-authenticated-area-queue'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function AreaQueuePage({ params }: Props) {
  const { brigadeId, areaId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const repo = new PrismaTurnoRepository(prisma)
  const queue = await new GetAuthenticatedAreaQueueUseCase(repo)
    .execute({ brigadeId, areaId, userId: user.id })
    .catch(() => null)

  if (!queue) notFound()

  return (
    <>
      <PageHeader
        title={queue.area.nombre}
        backHref={`/dashboard/brigades/${brigadeId}`}
      />
      <div className="px-5 pt-2 pb-4">
        <AreaDashboard queue={queue} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Redirect the legacy area queue page**

```tsx
// app/(dashboard)/brigades/[brigadeId]/areas/[areaId]/page.tsx
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
}

export default async function LegacyAreaQueuePage({ params }: Props) {
  const { brigadeId, areaId } = await params
  redirect(`/dashboard/brigades/${brigadeId}/areas/${areaId}`)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/brigades/\[brigadeId\]/areas/\[areaId\]/page.tsx \
        app/\(dashboard\)/brigades/\[brigadeId\]/areas/\[areaId\]/page.tsx
git commit -m "feat(turnos): wire area queue page to real authenticated queue data"
```

---

## Task 15: Wire Public Dashboard

**Files:**

- Modify: `app/(public)/dashboard/[brigadeId]/[areaId]/page.tsx`

- [ ] **Step 1: Wire public area page**

```tsx
// app/(public)/dashboard/[brigadeId]/[areaId]/page.tsx
import { notFound } from 'next/navigation'
import { PublicAreaDashboard } from '@/src/turnos/infrastructure/components/PublicAreaDashboard'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'

interface Props {
  params: Promise<{ brigadeId: string; areaId: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PublicAreaPage({ params, searchParams }: Props) {
  const { brigadeId, areaId } = await params
  const { token } = await searchParams

  if (!token) notFound()

  const repo = new PrismaTurnoRepository(prisma)
  const queue = await new GetPublicAreaQueueUseCase(repo)
    .execute({ brigadeId, areaId, token })
    .catch(() => null)

  if (!queue) notFound()

  return (
    <main className="relative min-h-dvh overflow-hidden">
      <div className="bg-brand-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.3),transparent_70%)]" />
      <div className="relative mx-auto max-w-2xl px-6 py-10 md:py-16">
        <PublicAreaDashboard
          areaName={queue.area.nombre}
          prefix={queue.area.prefijo}
          currentLabel={queue.turnoActual?.label}
          upcoming={queue.enEspera.map((t) => t.label)}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(public\)/dashboard/\[brigadeId\]/\[areaId\]/page.tsx
git commit -m "feat(public): wire public area dashboard to real queue data"
```

---

## Task 16: Wire Dashboard Patients page + Redirect Legacy pages

**Files:**

- Modify: `app/(dashboard)/dashboard/patients/page.tsx`
- Modify: `app/(dashboard)/brigades/page.tsx`
- Modify: `app/(dashboard)/brigades/[brigadeId]/page.tsx`

- [ ] **Step 1: Wire the global patients page**

```tsx
// app/(dashboard)/dashboard/patients/page.tsx
import { redirect } from 'next/navigation'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'

export default async function PatientsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const brigades = await new ListBrigadesUseCase(new PrismaBrigadeRepository(prisma)).execute({
    userId: user.id,
  })

  const activeBrigade = brigades.find((b) => b.status === 'ACTIVE') ?? brigades[0] ?? null

  if (!activeBrigade) {
    return (
      <>
        <PageHeader
          title="Pacientes"
          backHref="/dashboard"
        />
        <div className="px-5 pt-10 text-center text-sm text-[var(--muted)]">
          No hay brigadas disponibles. Crea una brigada primero.
        </div>
      </>
    )
  }

  const patientRepo = new PrismaPatientRepository(prisma)
  const { pacientes } = await new ListPatientsUseCase(patientRepo).execute({
    brigadeId: activeBrigade.id,
    userId: user.id,
    pagina: 1,
    limite: 50,
  })

  return (
    <>
      <PageHeader
        title="Pacientes"
        backHref="/dashboard"
      />

      <div className="px-5 pt-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              placeholder="Buscar por nombre o turno"
              className="pl-11"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Mostrando pacientes de: {activeBrigade.name}</p>
      </div>

      <div className="space-y-2 px-5 pt-4">
        {pacientes.map((p) => (
          <Card
            key={p.id}
            className="flex items-center gap-3 p-4"
          >
            <Avatar
              initials={p.nombreCompleto.slice(0, 1)}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.nombreCompleto}</p>
              <p className="text-xs text-[var(--muted)]">{p.edad} años</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {p.turnos.map((t) => (
                <Badge
                  key={t.id}
                  variant={t.status === 'SERVED' ? 'muted' : 'primary'}
                >
                  {t.label}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
        {pacientes.length === 0 && (
          <p className="pt-10 text-center text-sm text-[var(--muted)]">No hay pacientes registrados.</p>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 2: Check ListPatientsUseCase return type**

```bash
cat src/patients/application/use-cases/list-patients.ts | head -30
cat src/patients/domain/entities/Patient.ts | head -30
```

Adjust the `pacientes` field access above based on the actual returned type.

- [ ] **Step 3: Redirect legacy brigades list page**

```tsx
// app/(dashboard)/brigades/page.tsx
import { redirect } from 'next/navigation'

export default function LegacyBrigadeListPage() {
  redirect('/dashboard/brigades')
}
```

- [ ] **Step 4: Redirect legacy brigade detail page**

```tsx
// app/(dashboard)/brigades/[brigadeId]/page.tsx
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function LegacyBrigadeDetailPage({ params }: Props) {
  const { brigadeId } = await params
  redirect(`/dashboard/brigades/${brigadeId}`)
}
```

- [ ] **Step 5: Verify all TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error TS" | head -30
```

Expected: clean build with no TS errors.

- [ ] **Step 6: Run all unit tests**

```bash
bun run test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add app/\(dashboard\)/dashboard/patients/page.tsx \
        app/\(dashboard\)/brigades/page.tsx \
        app/\(dashboard\)/brigades/\[brigadeId\]/page.tsx
git commit -m "feat: wire patients page and redirect legacy brigade routes"
```

---

## Final Verification

- [ ] **Start dev server and verify routes**

```bash
bun run dev
```

Check in browser:

1. `/login` — form submits → redirects to `/dashboard`
2. `/register` — form submits → creates account
3. `/dashboard` — shows real brigades, correct user name
4. `/dashboard/brigades` — lists real brigades
5. `/dashboard/brigades/new` — creates brigade → redirects to detail
6. `/dashboard/brigades/[id]` — shows real brigade + real areas
7. `/dashboard/brigades/[id]/settings` — loads real data, save works
8. `/dashboard/brigades/[id]/patients/new` — loads real areas, form submits
9. `/dashboard/brigades/[id]/areas/[id]` — shows real queue
10. `/public/dashboard/[id]/[id]?token=...` — shows real public queue
11. `/brigades` → redirects to `/dashboard/brigades`

- [ ] **Final commit**

```bash
git add -A
git commit -m "chore: final verification — frontend fully connected to backend"
```
