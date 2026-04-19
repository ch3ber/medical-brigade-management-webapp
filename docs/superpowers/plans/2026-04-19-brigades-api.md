# Brigades API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full `brigades` domain slice (domain → application → infrastructure → route handlers) following Clean Architecture.

**Architecture:** Domain entities and interfaces in `src/brigades/domain/`, use cases in `src/brigades/application/use-cases/`, Prisma repository + route handlers in infrastructure/app layers. Route handlers are thin: validate with Zod → call use case → return envelope.

**Tech Stack:** TypeScript 5 strict, Next.js 16 App Router, Prisma 5, Zod 4, Vitest, Supabase Auth (`@supabase/ssr`).

**Key Next.js 16 note:** Route handler `params` is a `Promise` and must be awaited. Use `Response.json()` (not `NextResponse.json()`).

---

## File Map

| File                                                                   | Purpose                                   |
| ---------------------------------------------------------------------- | ----------------------------------------- |
| `src/brigades/domain/entities/Brigade.ts`                              | Brigade entity with business rule methods |
| `src/brigades/domain/entities/tests/unit/Brigade.test.ts`              | Unit tests for entity                     |
| `src/brigades/domain/value-objects/BrigadeStatus.ts`                   | Status enum + transition guard            |
| `src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts`   | Unit tests for value object               |
| `src/brigades/domain/repositories/IBrigadeRepository.ts`               | Repository interface + data types         |
| `src/brigades/application/use-cases/get-brigade.ts`                    | Fetch brigade by id                       |
| `src/brigades/application/use-cases/update-brigade.ts`                 | Update brigade fields                     |
| `src/brigades/application/use-cases/open-brigade.ts`                   | DRAFT → ACTIVE transition                 |
| `src/brigades/application/use-cases/close-brigade.ts`                  | ACTIVE → CLOSED transition                |
| `src/brigades/application/use-cases/clone-brigade.ts`                  | Create new DRAFT brigade from source      |
| `src/brigades/application/use-cases/tests/unit/get-brigade.test.ts`    | Use case unit tests                       |
| `src/brigades/application/use-cases/tests/unit/update-brigade.test.ts` | Use case unit tests                       |
| `src/brigades/application/use-cases/tests/unit/open-brigade.test.ts`   | Use case unit tests                       |
| `src/brigades/application/use-cases/tests/unit/close-brigade.test.ts`  | Use case unit tests                       |
| `src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts`  | Use case unit tests                       |
| `src/brigades/infrastructure/prisma-brigade-repository.ts`             | Prisma impl of IBrigadeRepository         |
| `app/api/v1/brigades/[brigadeId]/route.ts`                             | GET + PATCH brigade                       |
| `app/api/v1/brigades/[brigadeId]/open/route.ts`                        | POST open brigade                         |
| `app/api/v1/brigades/[brigadeId]/close/route.ts`                       | POST close brigade                        |
| `app/api/v1/brigades/[brigadeId]/clone/route.ts`                       | POST clone brigade                        |

---

## Task 1: Brigade Domain Entity

**Files:**

- Create: `src/brigades/domain/entities/Brigade.ts`
- Create: `src/brigades/domain/entities/tests/unit/Brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/domain/entities/tests/unit/Brigade.test.ts
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeBrigade(overrides: Partial<ConstructorParameters<typeof Brigade>[0]> = {}) {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte, Monterrey',
    date: new Date('2026-04-19'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  })
}

describe('Brigade entity', () => {
  describe('canOpen()', () => {
    it('returns true when status is DRAFT', () => {
      const brigade = makeBrigade({ status: 'DRAFT' })
      expect(brigade.canOpen()).toBe(true)
    })

    it('returns false when status is ACTIVE', () => {
      const brigade = makeBrigade({ status: 'ACTIVE' })
      expect(brigade.canOpen()).toBe(false)
    })

    it('returns false when status is CLOSED', () => {
      const brigade = makeBrigade({ status: 'CLOSED' })
      expect(brigade.canOpen()).toBe(false)
    })
  })

  describe('canClose()', () => {
    it('returns true when status is ACTIVE', () => {
      const brigade = makeBrigade({ status: 'ACTIVE' })
      expect(brigade.canClose()).toBe(true)
    })

    it('returns false when status is DRAFT', () => {
      const brigade = makeBrigade({ status: 'DRAFT' })
      expect(brigade.canClose()).toBe(false)
    })

    it('returns false when status is CLOSED', () => {
      const brigade = makeBrigade({ status: 'CLOSED' })
      expect(brigade.canClose()).toBe(false)
    })
  })

  describe('isEditable()', () => {
    it('returns true when status is DRAFT', () => {
      expect(makeBrigade({ status: 'DRAFT' }).isEditable()).toBe(true)
    })

    it('returns true when status is ACTIVE', () => {
      expect(makeBrigade({ status: 'ACTIVE' }).isEditable()).toBe(true)
    })

    it('returns false when status is CLOSED', () => {
      expect(makeBrigade({ status: 'CLOSED' }).isEditable()).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/domain/entities/tests/unit/Brigade.test.ts
```

Expected: FAIL — `Cannot find module '@/src/brigades/domain/entities/Brigade'`

- [ ] **Step 3: Implement the entity**

```typescript
// src/brigades/domain/entities/Brigade.ts

export type BrigadeStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface BrigadeProps {
  id: string
  name: string
  description: string | null
  location: string
  date: Date
  status: BrigadeStatus
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

export class Brigade {
  readonly id: string
  readonly name: string
  readonly description: string | null
  readonly location: string
  readonly date: Date
  readonly status: BrigadeStatus
  readonly openedAt: Date | null
  readonly closedAt: Date | null
  readonly createdBy: string
  readonly createdAt: Date

  constructor(props: BrigadeProps) {
    this.id = props.id
    this.name = props.name
    this.description = props.description
    this.location = props.location
    this.date = props.date
    this.status = props.status
    this.openedAt = props.openedAt
    this.closedAt = props.closedAt
    this.createdBy = props.createdBy
    this.createdAt = props.createdAt
  }

  canOpen(): boolean {
    return this.status === 'DRAFT'
  }

  canClose(): boolean {
    return this.status === 'ACTIVE'
  }

  isEditable(): boolean {
    return this.status !== 'CLOSED'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/domain/entities/tests/unit/Brigade.test.ts
```

Expected: PASS — 7 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/domain/entities/Brigade.ts src/brigades/domain/entities/tests/unit/Brigade.test.ts
git commit -m "feat(brigades): add Brigade domain entity"
```

---

## Task 2: BrigadeStatus Value Object

**Files:**

- Create: `src/brigades/domain/value-objects/BrigadeStatus.ts`
- Create: `src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts
import { assertStatusTransition } from '@/src/brigades/domain/value-objects/BrigadeStatus'

describe('assertStatusTransition', () => {
  it('allows DRAFT → ACTIVE', () => {
    expect(() => assertStatusTransition('DRAFT', 'ACTIVE')).not.toThrow()
  })

  it('allows ACTIVE → CLOSED', () => {
    expect(() => assertStatusTransition('ACTIVE', 'CLOSED')).not.toThrow()
  })

  it('throws for DRAFT → CLOSED', () => {
    expect(() => assertStatusTransition('DRAFT', 'CLOSED')).toThrow('INVALID_TRANSITION')
  })

  it('throws for ACTIVE → DRAFT', () => {
    expect(() => assertStatusTransition('ACTIVE', 'DRAFT')).toThrow('INVALID_TRANSITION')
  })

  it('throws for CLOSED → ACTIVE', () => {
    expect(() => assertStatusTransition('CLOSED', 'ACTIVE')).toThrow('INVALID_TRANSITION')
  })

  it('throws for CLOSED → DRAFT', () => {
    expect(() => assertStatusTransition('CLOSED', 'DRAFT')).toThrow('INVALID_TRANSITION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the value object**

```typescript
// src/brigades/domain/value-objects/BrigadeStatus.ts
import type { BrigadeStatus } from '../entities/Brigade'

const VALID_TRANSITIONS: Record<BrigadeStatus, BrigadeStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['CLOSED'],
  CLOSED: [],
}

export function assertStatusTransition(from: BrigadeStatus, to: BrigadeStatus): void {
  if (!VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`INVALID_TRANSITION: ${from} -> ${to}`)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/domain/value-objects/BrigadeStatus.ts src/brigades/domain/value-objects/tests/unit/BrigadeStatus.test.ts
git commit -m "feat(brigades): add BrigadeStatus value object with transition guard"
```

---

## Task 3: IBrigadeRepository Interface

**Files:**

- Create: `src/brigades/domain/repositories/IBrigadeRepository.ts`

No test — this is a pure TypeScript interface.

- [ ] **Step 1: Create the interface**

```typescript
// src/brigades/domain/repositories/IBrigadeRepository.ts
import type { Brigade, BrigadeStatus } from '../entities/Brigade'

export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface CreateBrigadeData {
  name: string
  description: string | null
  location: string
  date: Date
  createdBy: string
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
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  create(data: CreateBrigadeData): Promise<Brigade>
  update(id: string, data: UpdateBrigadeData): Promise<Brigade>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/brigades/domain/repositories/IBrigadeRepository.ts
git commit -m "feat(brigades): add IBrigadeRepository interface"
```

---

## Task 4: GetBrigade Use Case

**Files:**

- Create: `src/brigades/application/use-cases/get-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/get-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/application/use-cases/tests/unit/get-brigade.test.ts
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade() {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('GetBrigadeUseCase', () => {
  it('returns the brigade when found', async () => {
    const brigade = makeBrigade()
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(brigade) })
    const useCase = new GetBrigadeUseCase(repo)

    const result = await useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toBe(brigade)
    expect(repo.findById).toHaveBeenCalledWith('brigade-1', 'user-1')
  })

  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new GetBrigadeUseCase(repo)

    await expect(useCase.execute({ brigadeId: 'missing-id', userId: 'user-1' })).rejects.toThrow(
      'BRIGADA_NO_ENCONTRADA',
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/get-brigade.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the use case**

```typescript
// src/brigades/application/use-cases/get-brigade.ts
import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface GetBrigadeDto {
  brigadeId: string
  userId: string
}

export class GetBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: GetBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')
    return brigade
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/get-brigade.test.ts
```

Expected: PASS — 2 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/get-brigade.ts src/brigades/application/use-cases/tests/unit/get-brigade.test.ts
git commit -m "feat(brigades): add GetBrigade use case"
```

---

## Task 5: UpdateBrigade Use Case

**Files:**

- Create: `src/brigades/application/use-cases/update-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/update-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/application/use-cases/tests/unit/update-brigade.test.ts
import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade(status: Brigade['status'] = 'DRAFT') {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status,
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('UpdateBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo()
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'missing', userId: 'user-1', data: { name: 'New Name' } }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws BRIGADA_CERRADA when brigade is CLOSED', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('throws SIN_PERMISO when member role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member (role is null)', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue(null),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('updates brigade when director', async () => {
    const updated = makeBrigade('DRAFT')
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      update: vi.fn().mockResolvedValue(updated),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    const result = await useCase.execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      data: { name: 'New Name' },
    })

    expect(result).toBe(updated)
    expect(repo.update).toHaveBeenCalledWith('brigade-1', { name: 'New Name' })
  })

  it('updates brigade when co-director', async () => {
    const updated = makeBrigade('ACTIVE')
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      update: vi.fn().mockResolvedValue(updated),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    const result = await useCase.execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      data: { location: 'New Location' },
    })

    expect(result).toBe(updated)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/update-brigade.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the use case**

```typescript
// src/brigades/application/use-cases/update-brigade.ts
import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository, UpdateBrigadeData } from '../../domain/repositories/IBrigadeRepository'

interface UpdateBrigadeDto {
  brigadeId: string
  userId: string
  data: UpdateBrigadeData
}

export class UpdateBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId, data }: UpdateBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')
    if (!brigade.isEditable()) throw new Error('BRIGADA_CERRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    return this.repo.update(brigadeId, data)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/update-brigade.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/update-brigade.ts src/brigades/application/use-cases/tests/unit/update-brigade.test.ts
git commit -m "feat(brigades): add UpdateBrigade use case"
```

---

## Task 6: OpenBrigade Use Case

**Files:**

- Create: `src/brigades/application/use-cases/open-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/open-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/application/use-cases/tests/unit/open-brigade.test.ts
import { OpenBrigadeUseCase } from '@/src/brigades/application/use-cases/open-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade(status: Brigade['status'] = 'DRAFT') {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status,
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('OpenBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo()
    await expect(
      new OpenBrigadeUseCase(repo).execute({ brigadeId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    await expect(
      new OpenBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_CERRADA when brigade is CLOSED', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new OpenBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('throws BRIGADA_CERRADA when brigade is already ACTIVE', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new OpenBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('opens brigade and sets openedAt when DRAFT + director', async () => {
    const openedBrigade = new Brigade({
      id: 'brigade-1',
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-19'),
      status: 'ACTIVE',
      openedAt: new Date(),
      closedAt: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      update: vi.fn().mockResolvedValue(openedBrigade),
    })

    const result = await new OpenBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('ACTIVE')
    expect(repo.update).toHaveBeenCalledWith(
      'brigade-1',
      expect.objectContaining({ status: 'ACTIVE', openedAt: expect.any(Date) }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/open-brigade.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the use case**

```typescript
// src/brigades/application/use-cases/open-brigade.ts
import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface OpenBrigadeDto {
  brigadeId: string
  userId: string
}

export class OpenBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: OpenBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    if (!brigade.canOpen()) throw new Error('BRIGADA_CERRADA')

    return this.repo.update(brigadeId, { status: 'ACTIVE', openedAt: new Date() })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/open-brigade.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/open-brigade.ts src/brigades/application/use-cases/tests/unit/open-brigade.test.ts
git commit -m "feat(brigades): add OpenBrigade use case"
```

---

## Task 7: CloseBrigade Use Case

**Files:**

- Create: `src/brigades/application/use-cases/close-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/close-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/application/use-cases/tests/unit/close-brigade.test.ts
import { CloseBrigadeUseCase } from '@/src/brigades/application/use-cases/close-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade(status: Brigade['status'] = 'ACTIVE') {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status,
    openedAt: status === 'ACTIVE' || status === 'CLOSED' ? new Date() : null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CloseBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo()
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade is DRAFT', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_CERRADA when brigade is already CLOSED', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('closes brigade and sets closedAt when ACTIVE + director', async () => {
    const closedBrigade = new Brigade({
      id: 'brigade-1',
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-19'),
      status: 'CLOSED',
      openedAt: new Date(),
      closedAt: new Date(),
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      update: vi.fn().mockResolvedValue(closedBrigade),
    })

    const result = await new CloseBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('CLOSED')
    expect(repo.update).toHaveBeenCalledWith(
      'brigade-1',
      expect.objectContaining({ status: 'CLOSED', closedAt: expect.any(Date) }),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/close-brigade.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the use case**

```typescript
// src/brigades/application/use-cases/close-brigade.ts
import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface CloseBrigadeDto {
  brigadeId: string
  userId: string
}

export class CloseBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: CloseBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    if (brigade.status === 'DRAFT') throw new Error('BRIGADA_NO_ACTIVA')
    if (!brigade.canClose()) throw new Error('BRIGADA_CERRADA')

    return this.repo.update(brigadeId, { status: 'CLOSED', closedAt: new Date() })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/close-brigade.test.ts
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/brigades/application/use-cases/close-brigade.ts src/brigades/application/use-cases/tests/unit/close-brigade.test.ts
git commit -m "feat(brigades): add CloseBrigade use case"
```

---

## Task 8: CloneBrigade Use Case

**Files:**

- Create: `src/brigades/application/use-cases/clone-brigade.ts`
- Create: `src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts
import { CloneBrigadeUseCase } from '@/src/brigades/application/use-cases/clone-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeSourceBrigade() {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: 'Brigada original',
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status: 'ACTIVE',
    openedAt: new Date(),
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CloneBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when source brigade not found', async () => {
    const repo = makeMockRepo()
    await expect(
      new CloneBrigadeUseCase(repo).execute({
        brigadeId: 'missing',
        userId: 'user-1',
        name: 'Clon',
        date: '2026-09-01',
      }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    await expect(
      new CloneBrigadeUseCase(repo).execute({
        brigadeId: 'brigade-1',
        userId: 'user-1',
        name: 'Clon',
        date: '2026-09-01',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('creates new DRAFT brigade with source location and description', async () => {
    const newBrigade = new Brigade({
      id: 'brigade-2',
      name: 'Clon',
      description: 'Brigada original',
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      create: vi.fn().mockResolvedValue(newBrigade),
    })

    const result = await new CloneBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      name: 'Clon',
      date: '2026-09-01',
    })

    expect(result).toBe(newBrigade)
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Clon',
      description: 'Brigada original',
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      createdBy: 'user-1',
    })
  })

  it('co-director can clone brigade', async () => {
    const newBrigade = new Brigade({
      id: 'brigade-2',
      name: 'Clon',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      create: vi.fn().mockResolvedValue(newBrigade),
    })

    const result = await new CloneBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      name: 'Clon',
      date: '2026-09-01',
    })

    expect(result).toBe(newBrigade)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement the use case**

```typescript
// src/brigades/application/use-cases/clone-brigade.ts
import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface CloneBrigadeDto {
  brigadeId: string
  userId: string
  name: string
  date: string
}

export class CloneBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId, name, date }: CloneBrigadeDto): Promise<Brigade> {
    const source = await this.repo.findById(brigadeId, userId)
    if (!source) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    return this.repo.create({
      name,
      description: source.description,
      location: source.location,
      date: new Date(date),
      createdBy: userId,
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Run all brigade use case tests**

```bash
bun run test src/brigades/application/use-cases/tests/unit/
```

Expected: PASS — 21 tests pass across 5 test files

- [ ] **Step 6: Commit**

```bash
git add src/brigades/application/use-cases/clone-brigade.ts src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts
git commit -m "feat(brigades): add CloneBrigade use case"
```

---

## Task 9: PrismaBrigadeRepository

**Files:**

- Create: `src/brigades/infrastructure/prisma-brigade-repository.ts`

No unit tests — this class requires a live database. Test via integration/e2e after route handlers are wired up.

- [ ] **Step 1: Implement the repository**

```typescript
// src/brigades/infrastructure/prisma-brigade-repository.ts
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { Brigade } from '../domain/entities/Brigade'
import type {
  IBrigadeRepository,
  BrigadeRole,
  CreateBrigadeData,
  UpdateBrigadeData,
} from '../domain/repositories/IBrigadeRepository'

type PrismaBrigade = {
  id: string
  name: string
  description: string | null
  location: string
  date: Date
  status: string
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

function toDomain(row: PrismaBrigade): Brigade {
  return new Brigade({
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    date: row.date,
    status: row.status as Brigade['status'],
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  })
}

export class PrismaBrigadeRepository implements IBrigadeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<Brigade | null> {
    const row = await this.prisma.brigade.findFirst({
      where: {
        id,
        members: { some: { profileId: userId } },
      },
    })
    return row ? toDomain(row) : null
  }

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (profile?.role === 'PLATFORM_ADMIN') return 'DIRECTOR'

    const member = await this.prisma.brigadeMember.findFirst({
      where: { brigadeId, profileId: userId },
      select: { role: true },
    })
    return (member?.role as BrigadeRole) ?? null
  }

  async create(data: CreateBrigadeData): Promise<Brigade> {
    const row = await this.prisma.brigade.create({
      data: {
        name: data.name,
        description: data.description,
        location: data.location,
        date: data.date,
        createdBy: data.createdBy,
        members: {
          create: {
            email: '',
            role: 'DIRECTOR',
            profileId: data.createdBy,
          },
        },
      },
    })
    return toDomain(row)
  }

  async update(id: string, data: UpdateBrigadeData): Promise<Brigade> {
    const row = await this.prisma.brigade.update({
      where: { id },
      data,
    })
    return toDomain(row)
  }
}
```

> **Note on `create`:** The `members.create` block adds the creator as `DIRECTOR` automatically. The `email` field is required by the schema — use the user's email in production by fetching it from Supabase Auth in the route handler and passing it through `CreateBrigadeData`. For now the interface accepts an optional `creatorEmail` field (add it to `CreateBrigadeData` in the interface and pass it here).

- [ ] **Step 2: Add `creatorEmail` to `CreateBrigadeData` in the repository interface**

```typescript
// src/brigades/domain/repositories/IBrigadeRepository.ts
// Update CreateBrigadeData to add creatorEmail:
export interface CreateBrigadeData {
  name: string
  description: string | null
  location: string
  date: Date
  createdBy: string
  creatorEmail: string
}
```

- [ ] **Step 3: Update `prisma-brigade-repository.ts` to use `creatorEmail`**

In the `create` method, change `email: ''` to `email: data.creatorEmail`.

- [ ] **Step 4: Update `clone-brigade.ts` use case to pass `creatorEmail`**

The `CloneBrigadeDto` needs `creatorEmail`. The route handler will provide this from the Supabase user object.

```typescript
// src/brigades/application/use-cases/clone-brigade.ts
interface CloneBrigadeDto {
  brigadeId: string
  userId: string
  creatorEmail: string
  name: string
  date: string
}

// In execute(), update repo.create call:
return this.repo.create({
  name,
  description: source.description,
  location: source.location,
  date: new Date(date),
  createdBy: userId,
  creatorEmail,
})
```

- [ ] **Step 5: Update clone-brigade unit test to pass `creatorEmail`**

In `src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts`, add `creatorEmail: 'user@example.com'` to all `execute()` calls and update the `expect(repo.create).toHaveBeenCalledWith(...)` assertions.

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
bun run test src/brigades/
```

Expected: PASS — all 21+ tests pass

- [ ] **Step 7: Commit**

```bash
git add src/brigades/infrastructure/prisma-brigade-repository.ts src/brigades/domain/repositories/IBrigadeRepository.ts src/brigades/application/use-cases/clone-brigade.ts src/brigades/application/use-cases/tests/unit/clone-brigade.test.ts
git commit -m "feat(brigades): add PrismaBrigadeRepository"
```

---

## Task 10: Route Handler — GET/PATCH /brigades/[brigadeId]

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/route.ts`

Response envelope helper (shared across all routes in this task group):

```typescript
// Helper used inline in each route file:
function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}
function err(code: string, message: string, status: number, fields?: { field: string; message: string }[]) {
  return Response.json(
    { success: false, data: null, errors: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}
```

Error code → HTTP status map (used in all route files):

```typescript
const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}
```

- [ ] **Step 1: Implement the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'

const patchSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  ubicacion: z.string().min(1).optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato YYYY-MM-DD')
    .optional(),
})

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number, fields?: { field: string; message: string }[]) {
  return Response.json(
    { success: false, data: null, errors: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new GetBrigadeUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok({
      id: brigade.id,
      nombre: brigade.name,
      descripcion: brigade.description,
      ubicacion: brigade.location,
      fecha: brigade.date.toISOString().split('T')[0],
      status: brigade.status,
      abertaEn: brigade.openedAt?.toISOString() ?? null,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
      creadoPor: brigade.createdBy,
      creadoEn: brigade.createdAt.toISOString(),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  const { nombre, descripcion, ubicacion, fecha } = parsed.data

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new UpdateBrigadeUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      data: {
        ...(nombre !== undefined && { name: nombre }),
        ...(descripcion !== undefined && { description: descripcion }),
        ...(ubicacion !== undefined && { location: ubicacion }),
        ...(fecha !== undefined && { date: new Date(fecha) }),
      },
    })

    return ok({
      id: brigade.id,
      nombre: brigade.name,
      descripcion: brigade.description,
      ubicacion: brigade.location,
      fecha: brigade.date.toISOString().split('T')[0],
      status: brigade.status,
      abertaEn: brigade.openedAt?.toISOString() ?? null,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
      creadoPor: brigade.createdBy,
      creadoEn: brigade.createdAt.toISOString(),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/brigades/[brigadeId]/route.ts
git commit -m "feat(brigades): add GET/PATCH /api/v1/brigades/[brigadeId] route"
```

---

## Task 11: Route Handler — POST /brigades/[brigadeId]/open

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/open/route.ts`

- [ ] **Step 1: Implement the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/open/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { OpenBrigadeUseCase } from '@/src/brigades/application/use-cases/open-brigade'

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new OpenBrigadeUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok({
      id: brigade.id,
      status: brigade.status,
      abertaEn: brigade.openedAt?.toISOString() ?? null,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/brigades/[brigadeId]/open/route.ts
git commit -m "feat(brigades): add POST /api/v1/brigades/[brigadeId]/open route"
```

---

## Task 12: Route Handler — POST /brigades/[brigadeId]/close

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/close/route.ts`

- [ ] **Step 1: Implement the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/close/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { CloseBrigadeUseCase } from '@/src/brigades/application/use-cases/close-brigade'

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new CloseBrigadeUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok({
      id: brigade.id,
      status: brigade.status,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/brigades/[brigadeId]/close/route.ts
git commit -m "feat(brigades): add POST /api/v1/brigades/[brigadeId]/close route"
```

---

## Task 13: Route Handler — POST /brigades/[brigadeId]/clone

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/clone/route.ts`

- [ ] **Step 1: Implement the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/clone/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { CloneBrigadeUseCase } from '@/src/brigades/application/use-cases/clone-brigade'

const cloneSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe ser una fecha válida en formato YYYY-MM-DD.'),
})

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number, fields?: { field: string; message: string }[]) {
  return Response.json(
    { success: false, data: null, errors: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = cloneSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new CloneBrigadeUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      creatorEmail: user.email ?? '',
      name: parsed.data.nombre,
      date: parsed.data.fecha,
    })

    return ok(
      {
        id: brigade.id,
        nombre: brigade.name,
        descripcion: brigade.description,
        ubicacion: brigade.location,
        fecha: brigade.date.toISOString().split('T')[0],
        status: brigade.status,
        creadoEn: brigade.createdAt.toISOString(),
      },
      201,
    )
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/v1/brigades/[brigadeId]/clone/route.ts
git commit -m "feat(brigades): add POST /api/v1/brigades/[brigadeId]/clone route"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
bun run test
```

Expected: PASS — all tests pass

- [ ] **Step 2: Type check**

```bash
bun run build
```

Expected: No TypeScript errors

- [ ] **Step 3: Verify lint**

```bash
bun run lint
```

Expected: No lint errors

- [ ] **Step 4: Commit if any lint fixes were needed**

```bash
git add -p
git commit -m "fix(brigades): lint fixes"
```
