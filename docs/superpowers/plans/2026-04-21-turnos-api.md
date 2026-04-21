# Turnos API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full turnos domain slice — entity, repository interface, 5 use cases, Prisma repository with advisory locks, and 5 API route handlers for queue operations and the public dashboard.

**Architecture:** Clean Architecture vertical slice at `src/turnos/`. Domain defines `Turno` entity + `ITurnoRepository`. Application layer holds 5 use-case classes. Infrastructure implements the repository with `prisma.$transaction` for all queue mutations. API routes are thin entry points under `app/api/v1/`.

**Tech Stack:** TypeScript 5 strict, Prisma 5, Next.js 14 App Router (params is a Promise), Zod, Vitest, Bun.

---

## File Map

| File                                                                              | Action | Responsibility                                          |
| --------------------------------------------------------------------------------- | ------ | ------------------------------------------------------- |
| `src/turnos/domain/entities/Turno.ts`                                             | Create | Turno entity class + TurnoProps interface               |
| `src/turnos/domain/entities/tests/unit/Turno.test.ts`                             | Create | Entity constructor tests                                |
| `src/turnos/domain/repositories/ITurnoRepository.ts`                              | Create | BrigadeRole, 7 result types, ITurnoRepository interface |
| `src/turnos/application/use-cases/call-next-turno.ts`                             | Create | CallNextTurnoUseCase                                    |
| `src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts`             | Create | 4 unit tests                                            |
| `src/turnos/application/use-cases/call-specific-turno.ts`                         | Create | CallSpecificTurnoUseCase                                |
| `src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts`         | Create | 4 unit tests                                            |
| `src/turnos/application/use-cases/move-turno-to-tail.ts`                          | Create | MoveTurnoToTailUseCase                                  |
| `src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts`          | Create | 4 unit tests                                            |
| `src/turnos/application/use-cases/remove-turno.ts`                                | Create | RemoveTurnoUseCase                                      |
| `src/turnos/application/use-cases/tests/unit/remove-turno.test.ts`                | Create | 4 unit tests                                            |
| `src/turnos/application/use-cases/get-public-area-queue.ts`                       | Create | GetPublicAreaQueueUseCase                               |
| `src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts`       | Create | 2 unit tests                                            |
| `src/turnos/infrastructure/prisma-turno-repository.ts`                            | Create | PrismaTurnoRepository — all 9 ITurnoRepository methods  |
| `app/api/v1/brigades/[brigadeId]/areas/[areaId]/next/route.ts`                    | Create | POST /next handler                                      |
| `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call/route.ts`   | Create | POST /call handler                                      |
| `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move/route.ts`   | Create | POST /move handler                                      |
| `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove/route.ts` | Create | POST /remove handler                                    |
| `app/api/v1/public/[brigadeId]/areas/[areaId]/route.ts`                           | Create | GET public area dashboard                               |

---

## Task 1: Turno entity + ITurnoRepository interface

**Files:**

- Create: `src/turnos/domain/entities/Turno.ts`
- Create: `src/turnos/domain/repositories/ITurnoRepository.ts`
- Create: `src/turnos/domain/entities/tests/unit/Turno.test.ts`

- [ ] **Step 1: Write the failing entity test**

```typescript
// src/turnos/domain/entities/tests/unit/Turno.test.ts
import { Turno } from '@/src/turnos/domain/entities/Turno'

const baseProps = {
  id: 'turno-1',
  brigadeId: 'brigade-1',
  areaId: 'area-1',
  patientId: 'patient-1',
  areaOrder: 3,
  status: 'WAITING',
  calledAt: null,
  servedAt: null,
  movedCount: 0,
  createdAt: new Date('2026-04-20'),
}

describe('Turno', () => {
  it('assigns all properties from props', () => {
    const turno = new Turno(baseProps)
    expect(turno.id).toBe('turno-1')
    expect(turno.brigadeId).toBe('brigade-1')
    expect(turno.areaId).toBe('area-1')
    expect(turno.patientId).toBe('patient-1')
    expect(turno.areaOrder).toBe(3)
    expect(turno.status).toBe('WAITING')
    expect(turno.calledAt).toBeNull()
    expect(turno.servedAt).toBeNull()
    expect(turno.movedCount).toBe(0)
  })

  it('accepts non-null calledAt and servedAt', () => {
    const calledAt = new Date('2026-04-20T10:00:00Z')
    const servedAt = new Date('2026-04-20T10:05:00Z')
    const turno = new Turno({ ...baseProps, calledAt, servedAt, status: 'SERVED' })
    expect(turno.calledAt).toBe(calledAt)
    expect(turno.servedAt).toBe(servedAt)
    expect(turno.status).toBe('SERVED')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/domain/entities/tests/unit/Turno.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/domain/entities/Turno`

- [ ] **Step 3: Create Turno entity**

```typescript
// src/turnos/domain/entities/Turno.ts
export interface TurnoProps {
  id: string
  brigadeId: string
  areaId: string
  patientId: string
  areaOrder: number
  status: string
  calledAt: Date | null
  servedAt: Date | null
  movedCount: number
  createdAt: Date
}

export class Turno {
  readonly id: string
  readonly brigadeId: string
  readonly areaId: string
  readonly patientId: string
  readonly areaOrder: number
  readonly status: string
  readonly calledAt: Date | null
  readonly servedAt: Date | null
  readonly movedCount: number
  readonly createdAt: Date

  constructor(props: TurnoProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.areaId = props.areaId
    this.patientId = props.patientId
    this.areaOrder = props.areaOrder
    this.status = props.status
    this.calledAt = props.calledAt
    this.servedAt = props.servedAt
    this.movedCount = props.movedCount
    this.createdAt = props.createdAt
  }
}
```

- [ ] **Step 4: Create ITurnoRepository interface**

```typescript
// src/turnos/domain/repositories/ITurnoRepository.ts
export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface ServedTurnoInfo {
  id: string
  label: string
  atendidoEn: Date
}

export interface CalledTurnoInfo {
  id: string
  label: string
  patient: { nombre: string; edad: number }
  llamadoEn: Date
}

export interface NextTurnoResult {
  atendido: ServedTurnoInfo | null
  llamado: CalledTurnoInfo | null
  enEspera: number
}

export interface MovedTurnoInfo {
  id: string
  label: string
  vecesMovido: number
  nuevoOrden: number
}

export interface MoveResult {
  movido: MovedTurnoInfo
  llamado: CalledTurnoInfo | null
}

export interface RemoveResult {
  eliminado: { id: string; label: string }
  llamado: CalledTurnoInfo | null
}

export interface PublicAreaQueue {
  area: { nombre: string; prefijo: string; color: string }
  turnoActual: { label: string } | null
  enEspera: { label: string }[]
}

export interface ITurnoRepository {
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null>
  findWaitingTurno(turnoId: string, areaId: string): Promise<{ id: string } | null>
  findCalledTurno(turnoId: string, areaId: string): Promise<{ id: string } | null>
  callNext(brigadeId: string, areaId: string): Promise<NextTurnoResult>
  callSpecific(brigadeId: string, areaId: string, turnoId: string): Promise<NextTurnoResult>
  moveToTail(brigadeId: string, areaId: string, turnoId: string): Promise<MoveResult>
  remove(brigadeId: string, areaId: string, turnoId: string): Promise<RemoveResult>
  getPublicAreaQueue(brigadeId: string, areaId: string, token: string): Promise<PublicAreaQueue | null>
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
bun run test src/turnos/domain/entities/tests/unit/Turno.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 6: Commit**

```bash
git add src/turnos/domain/entities/Turno.ts src/turnos/domain/repositories/ITurnoRepository.ts src/turnos/domain/entities/tests/unit/Turno.test.ts
git commit -m "feat(turnos): add Turno entity and ITurnoRepository interface"
```

---

## Task 2: CallNextTurno use case

**Files:**

- Create: `src/turnos/application/use-cases/call-next-turno.ts`
- Create: `src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CallNextTurnoUseCase } from '@/src/turnos/application/use-cases/call-next-turno'
import type { ITurnoRepository, NextTurnoResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeNextResult = (): NextTurnoResult => ({
  atendido: null,
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
  enEspera: 3,
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', userId: 'user-1' }

describe('CallNextTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade status is not ACTIVE', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
    })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not found', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue(null),
    })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('delegates to repo.callNext and returns NextTurnoResult', async () => {
    const result = makeNextResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      callNext: vi.fn().mockResolvedValue(result),
    })
    const res = await new CallNextTurnoUseCase(repo).execute(baseDto)
    expect(repo.callNext).toHaveBeenCalledWith('brigade-1', 'area-1')
    expect(res).toBe(result)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/application/use-cases/call-next-turno`

- [ ] **Step 3: Implement CallNextTurnoUseCase**

```typescript
// src/turnos/application/use-cases/call-next-turno.ts
import type { ITurnoRepository, NextTurnoResult } from '../../domain/repositories/ITurnoRepository'

interface CallNextTurnoDto {
  brigadeId: string
  areaId: string
  userId: string
}

export class CallNextTurnoUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, userId }: CallNextTurnoDto): Promise<NextTurnoResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    return this.repo.callNext(brigadeId, areaId)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/turnos/application/use-cases/call-next-turno.ts src/turnos/application/use-cases/tests/unit/call-next-turno.test.ts
git commit -m "feat(turnos): add CallNextTurno use case"
```

---

## Task 3: CallSpecificTurno use case

**Files:**

- Create: `src/turnos/application/use-cases/call-specific-turno.ts`
- Create: `src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts
import { describe, it, expect, vi } from 'vitest'
import { CallSpecificTurnoUseCase } from '@/src/turnos/application/use-cases/call-specific-turno'
import type { ITurnoRepository, NextTurnoResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeNextResult = (): NextTurnoResult => ({
  atendido: { id: 'turno-1', label: 'D-1', atendidoEn: new Date() },
  llamado: { id: 'turno-5', label: 'D-5', patient: { nombre: 'Carlos', edad: 40 }, llamadoEn: new Date() },
  enEspera: 2,
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-5', userId: 'user-1' }

describe('CallSpecificTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno not in WAITING status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findWaitingTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.callSpecific and returns NextTurnoResult', async () => {
    const result = makeNextResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findWaitingTurno: vi.fn().mockResolvedValue({ id: 'turno-5' }),
      callSpecific: vi.fn().mockResolvedValue(result),
    })
    const res = await new CallSpecificTurnoUseCase(repo).execute(baseDto)
    expect(repo.callSpecific).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-5')
    expect(res).toBe(result)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/application/use-cases/call-specific-turno`

- [ ] **Step 3: Implement CallSpecificTurnoUseCase**

```typescript
// src/turnos/application/use-cases/call-specific-turno.ts
import type { ITurnoRepository, NextTurnoResult } from '../../domain/repositories/ITurnoRepository'

interface CallSpecificTurnoDto {
  brigadeId: string
  areaId: string
  turnoId: string
  userId: string
}

export class CallSpecificTurnoUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, turnoId, userId }: CallSpecificTurnoDto): Promise<NextTurnoResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const turno = await this.repo.findWaitingTurno(turnoId, areaId)
    if (!turno) throw new Error('TURNO_NO_ENCONTRADO')

    return this.repo.callSpecific(brigadeId, areaId, turnoId)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/turnos/application/use-cases/call-specific-turno.ts src/turnos/application/use-cases/tests/unit/call-specific-turno.test.ts
git commit -m "feat(turnos): add CallSpecificTurno use case"
```

---

## Task 4: MoveTurnoToTail use case

**Files:**

- Create: `src/turnos/application/use-cases/move-turno-to-tail.ts`
- Create: `src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts
import { describe, it, expect, vi } from 'vitest'
import { MoveTurnoToTailUseCase } from '@/src/turnos/application/use-cases/move-turno-to-tail'
import type { ITurnoRepository, MoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeMoveResult = (): MoveResult => ({
  movido: { id: 'turno-1', label: 'D-8', vecesMovido: 1, nuevoOrden: 8 },
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-1', userId: 'user-1' }

describe('MoveTurnoToTailUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno is not in CALLED status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.moveToTail and returns MoveResult', async () => {
    const result = makeMoveResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue({ id: 'turno-1' }),
      moveToTail: vi.fn().mockResolvedValue(result),
    })
    const res = await new MoveTurnoToTailUseCase(repo).execute(baseDto)
    expect(repo.moveToTail).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-1')
    expect(res).toBe(result)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/application/use-cases/move-turno-to-tail`

- [ ] **Step 3: Implement MoveTurnoToTailUseCase**

```typescript
// src/turnos/application/use-cases/move-turno-to-tail.ts
import type { ITurnoRepository, MoveResult } from '../../domain/repositories/ITurnoRepository'

interface MoveTurnoToTailDto {
  brigadeId: string
  areaId: string
  turnoId: string
  userId: string
}

export class MoveTurnoToTailUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, turnoId, userId }: MoveTurnoToTailDto): Promise<MoveResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const turno = await this.repo.findCalledTurno(turnoId, areaId)
    if (!turno) throw new Error('TURNO_NO_ENCONTRADO')

    return this.repo.moveToTail(brigadeId, areaId, turnoId)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/turnos/application/use-cases/move-turno-to-tail.ts src/turnos/application/use-cases/tests/unit/move-turno-to-tail.test.ts
git commit -m "feat(turnos): add MoveTurnoToTail use case"
```

---

## Task 5: RemoveTurno use case

**Files:**

- Create: `src/turnos/application/use-cases/remove-turno.ts`
- Create: `src/turnos/application/use-cases/tests/unit/remove-turno.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/turnos/application/use-cases/tests/unit/remove-turno.test.ts
import { describe, it, expect, vi } from 'vitest'
import { RemoveTurnoUseCase } from '@/src/turnos/application/use-cases/remove-turno'
import type { ITurnoRepository, RemoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeRemoveResult = (): RemoveResult => ({
  eliminado: { id: 'turno-1', label: 'D-1' },
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-1', userId: 'user-1' }

describe('RemoveTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
    })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno is not in CALLED status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.remove and returns RemoveResult', async () => {
    const result = makeRemoveResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue({ id: 'turno-1' }),
      remove: vi.fn().mockResolvedValue(result),
    })
    const res = await new RemoveTurnoUseCase(repo).execute(baseDto)
    expect(repo.remove).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-1')
    expect(res).toBe(result)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/remove-turno.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/application/use-cases/remove-turno`

- [ ] **Step 3: Implement RemoveTurnoUseCase**

```typescript
// src/turnos/application/use-cases/remove-turno.ts
import type { ITurnoRepository, RemoveResult } from '../../domain/repositories/ITurnoRepository'

interface RemoveTurnoDto {
  brigadeId: string
  areaId: string
  turnoId: string
  userId: string
}

export class RemoveTurnoUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, turnoId, userId }: RemoveTurnoDto): Promise<RemoveResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const turno = await this.repo.findCalledTurno(turnoId, areaId)
    if (!turno) throw new Error('TURNO_NO_ENCONTRADO')

    return this.repo.remove(brigadeId, areaId, turnoId)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/turnos/application/use-cases/tests/unit/remove-turno.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/turnos/application/use-cases/remove-turno.ts src/turnos/application/use-cases/tests/unit/remove-turno.test.ts
git commit -m "feat(turnos): add RemoveTurno use case"
```

---

## Task 6: GetPublicAreaQueue use case

**Files:**

- Create: `src/turnos/application/use-cases/get-public-area-queue.ts`
- Create: `src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts
import { describe, it, expect, vi } from 'vitest'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'
import type { ITurnoRepository, PublicAreaQueue } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeQueue = (): PublicAreaQueue => ({
  area: { nombre: 'Dental', prefijo: 'D', color: '#3b82f6' },
  turnoActual: { label: 'D-3' },
  enEspera: [{ label: 'D-4' }, { label: 'D-5' }],
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', token: 'token-uuid' }

describe('GetPublicAreaQueueUseCase', () => {
  it('throws AREA_NO_ENCONTRADA when token/area/brigade mismatch', async () => {
    const repo = makeMockRepo({ getPublicAreaQueue: vi.fn().mockResolvedValue(null) })
    await expect(new GetPublicAreaQueueUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_NO_ENCONTRADA')
  })

  it('returns PublicAreaQueue on valid token and area', async () => {
    const queue = makeQueue()
    const repo = makeMockRepo({ getPublicAreaQueue: vi.fn().mockResolvedValue(queue) })
    const res = await new GetPublicAreaQueueUseCase(repo).execute(baseDto)
    expect(repo.getPublicAreaQueue).toHaveBeenCalledWith('brigade-1', 'area-1', 'token-uuid')
    expect(res).toBe(queue)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts
```

Expected: FAIL — cannot find module `@/src/turnos/application/use-cases/get-public-area-queue`

- [ ] **Step 3: Implement GetPublicAreaQueueUseCase**

```typescript
// src/turnos/application/use-cases/get-public-area-queue.ts
import type { ITurnoRepository, PublicAreaQueue } from '../../domain/repositories/ITurnoRepository'

interface GetPublicAreaQueueDto {
  brigadeId: string
  areaId: string
  token: string
}

export class GetPublicAreaQueueUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, token }: GetPublicAreaQueueDto): Promise<PublicAreaQueue> {
    const queue = await this.repo.getPublicAreaQueue(brigadeId, areaId, token)
    if (!queue) throw new Error('AREA_NO_ENCONTRADA')
    return queue
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
bun run test src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Run the full test suite to confirm nothing is broken**

```bash
bun run test
```

Expected: all existing tests pass + 18 new turnos tests pass

- [ ] **Step 6: Commit**

```bash
git add src/turnos/application/use-cases/get-public-area-queue.ts src/turnos/application/use-cases/tests/unit/get-public-area-queue.test.ts
git commit -m "feat(turnos): add GetPublicAreaQueue use case"
```

---

## Task 7: PrismaTurnoRepository

**Files:**

- Create: `src/turnos/infrastructure/prisma-turno-repository.ts`

No new tests — unit tests mock the repository. The implementation will be validated end-to-end by the API routes.

- [ ] **Step 1: Create the repository file**

```typescript
// src/turnos/infrastructure/prisma-turno-repository.ts
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, TurnoStatus } from '@/shared/prisma/generated/enums'
import type {
  ITurnoRepository,
  BrigadeRole,
  ServedTurnoInfo,
  CalledTurnoInfo,
  NextTurnoResult,
  MoveResult,
  RemoveResult,
  PublicAreaQueue,
} from '../domain/repositories/ITurnoRepository'

export class PrismaTurnoRepository implements ITurnoRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const [profile, member] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.brigadeMember.findFirst({
        where: { brigadeId, profileId: userId },
        select: { role: true },
      }),
    ])
    if (profile?.role === AppRole.PLATFORM_ADMIN) return 'DIRECTOR'
    return (member?.role as BrigadeRole) ?? null
  }

  async findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null> {
    const brigade = await this.prisma.brigade.findFirst({
      where: { id: brigadeId, members: { some: { profileId: userId } } },
      select: { status: true },
    })
    return brigade ? { status: brigade.status } : null
  }

  async findWaitingTurno(turnoId: string, areaId: string): Promise<{ id: string } | null> {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, areaId, status: TurnoStatus.WAITING },
      select: { id: true },
    })
    return turno ? { id: turno.id } : null
  }

  async findCalledTurno(turnoId: string, areaId: string): Promise<{ id: string } | null> {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, areaId, status: TurnoStatus.CALLED },
      select: { id: true },
    })
    return turno ? { id: turno.id } : null
  }

  async callNext(brigadeId: string, areaId: string): Promise<NextTurnoResult> {
    return this.prisma.$transaction(async (tx) => {
      const called = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        include: { area: { select: { prefix: true } } },
      })
      let atendido: ServedTurnoInfo | null = null
      if (called) {
        const servedAt = new Date()
        await tx.turno.update({ where: { id: called.id }, data: { status: TurnoStatus.SERVED, servedAt } })
        atendido = { id: called.id, label: `${called.area.prefix}-${called.areaOrder}`, atendidoEn: servedAt }
      }

      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

      return { atendido, llamado, enEspera }
    })
  }

  async callSpecific(brigadeId: string, areaId: string, turnoId: string): Promise<NextTurnoResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        include: { area: { select: { prefix: true } } },
      })
      let atendido: ServedTurnoInfo | null = null
      if (existing) {
        const servedAt = new Date()
        await tx.turno.update({ where: { id: existing.id }, data: { status: TurnoStatus.SERVED, servedAt } })
        atendido = {
          id: existing.id,
          label: `${existing.area.prefix}-${existing.areaOrder}`,
          atendidoEn: servedAt,
        }
      }

      const llamadoEn = new Date()
      const updated = await tx.turno.update({
        where: { id: turnoId },
        data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      const llamado: CalledTurnoInfo = {
        id: updated.id,
        label: `${updated.area.prefix}-${updated.areaOrder}`,
        patient: { nombre: updated.patient.fullName, edad: updated.patient.age },
        llamadoEn,
      }

      const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

      return { atendido, llamado, enEspera }
    })
  }

  async moveToTail(brigadeId: string, areaId: string, turnoId: string): Promise<MoveResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

      const [{ max }] = await tx.$queryRaw<[{ max: number | null }]>`
        SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
      `
      const nuevoOrden = (max ?? 0) + 1

      const moved = await tx.turno.update({
        where: { id: turnoId },
        data: { status: TurnoStatus.WAITING, areaOrder: nuevoOrden, movedCount: { increment: 1 } },
        include: { area: { select: { prefix: true } } },
      })

      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING, id: { not: turnoId } },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      return {
        movido: {
          id: moved.id,
          label: `${moved.area.prefix}-${nuevoOrden}`,
          vecesMovido: moved.movedCount,
          nuevoOrden,
        },
        llamado,
      }
    })
  }

  async remove(brigadeId: string, areaId: string, turnoId: string): Promise<RemoveResult> {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.turno.update({
        where: { id: turnoId },
        data: { status: TurnoStatus.REMOVED },
        include: { area: { select: { prefix: true } } },
      })

      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      return {
        eliminado: { id: removed.id, label: `${removed.area.prefix}-${removed.areaOrder}` },
        llamado,
      }
    })
  }

  async getPublicAreaQueue(
    brigadeId: string,
    areaId: string,
    token: string,
  ): Promise<PublicAreaQueue | null> {
    const area = await this.prisma.area.findFirst({
      where: { id: areaId, brigadeId, publicDashboardToken: token },
      select: { name: true, prefix: true, color: true },
    })
    if (!area) return null

    const [called, waiting] = await Promise.all([
      this.prisma.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        select: { areaOrder: true },
      }),
      this.prisma.turno.findMany({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        select: { areaOrder: true },
      }),
    ])

    return {
      area: { nombre: area.name, prefijo: area.prefix, color: area.color },
      turnoActual: called ? { label: `${area.prefix}-${called.areaOrder}` } : null,
      enEspera: waiting.map((t) => ({ label: `${area.prefix}-${t.areaOrder}` })),
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no TypeScript errors in `src/turnos/infrastructure/prisma-turno-repository.ts`

- [ ] **Step 3: Commit**

```bash
git add src/turnos/infrastructure/prisma-turno-repository.ts
git commit -m "feat(turnos): add PrismaTurnoRepository implementation"
```

---

## Task 8: POST /next and POST /call route handlers

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/areas/[areaId]/next/route.ts`
- Create: `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call/route.ts`

Both handlers return the same JSON shape. The `CalledTurnoInfo.patient` field is serialized as `paciente` in the response.

- [ ] **Step 1: Create the /next route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/areas/[areaId]/next/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { CallNextTurnoUseCase } from '@/src/turnos/application/use-cases/call-next-turno'
import type { NextTurnoResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

function serializeNextResult(result: NextTurnoResult) {
  return {
    atendido: result.atendido
      ? { id: result.atendido.id, label: result.atendido.label, atendidoEn: result.atendido.atendidoEn }
      : null,
    llamado: result.llamado
      ? {
          id: result.llamado.id,
          label: result.llamado.label,
          paciente: { nombre: result.llamado.patient.nombre, edad: result.llamado.patient.edad },
          llamadoEn: result.llamado.llamadoEn,
        }
      : null,
    enEspera: result.enEspera,
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string }> },
) {
  const { brigadeId, areaId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const result = await new CallNextTurnoUseCase(repo).execute({ brigadeId, areaId, userId: user.id })
    return ok(serializeNextResult(result))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Create the /call route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { CallSpecificTurnoUseCase } from '@/src/turnos/application/use-cases/call-specific-turno'
import type { NextTurnoResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  BRIGADA_NO_ACTIVA: 409,
  TURNO_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  TURNO_NO_ENCONTRADO: 'El turno solicitado no existe.',
}

function serializeNextResult(result: NextTurnoResult) {
  return {
    atendido: result.atendido
      ? { id: result.atendido.id, label: result.atendido.label, atendidoEn: result.atendido.atendidoEn }
      : null,
    llamado: result.llamado
      ? {
          id: result.llamado.id,
          label: result.llamado.label,
          paciente: { nombre: result.llamado.patient.nombre, edad: result.llamado.patient.edad },
          llamadoEn: result.llamado.llamadoEn,
        }
      : null,
    enEspera: result.enEspera,
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string; turnoId: string }> },
) {
  const { brigadeId, areaId, turnoId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const result = await new CallSpecificTurnoUseCase(repo).execute({
      brigadeId,
      areaId,
      turnoId,
      userId: user.id,
    })
    return ok(serializeNextResult(result))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: no TypeScript errors in the new route files

- [ ] **Step 4: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/areas/[areaId]/next/route.ts" "app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call/route.ts"
git commit -m "feat(turnos): add POST /next and POST /call route handlers"
```

---

## Task 9: POST /move and POST /remove route handlers

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move/route.ts`
- Create: `app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove/route.ts`

- [ ] **Step 1: Create the /move route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { MoveTurnoToTailUseCase } from '@/src/turnos/application/use-cases/move-turno-to-tail'
import type { MoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  BRIGADA_NO_ACTIVA: 409,
  TURNO_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  TURNO_NO_ENCONTRADO: 'El turno solicitado no existe.',
}

function serializeMoveResult(result: MoveResult) {
  return {
    movido: {
      id: result.movido.id,
      label: result.movido.label,
      vecesMovido: result.movido.vecesMovido,
      nuevoOrden: result.movido.nuevoOrden,
    },
    llamado: result.llamado
      ? {
          id: result.llamado.id,
          label: result.llamado.label,
          paciente: { nombre: result.llamado.patient.nombre, edad: result.llamado.patient.edad },
          llamadoEn: result.llamado.llamadoEn,
        }
      : null,
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string; turnoId: string }> },
) {
  const { brigadeId, areaId, turnoId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const result = await new MoveTurnoToTailUseCase(repo).execute({
      brigadeId,
      areaId,
      turnoId,
      userId: user.id,
    })
    return ok(serializeMoveResult(result))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Create the /remove route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { RemoveTurnoUseCase } from '@/src/turnos/application/use-cases/remove-turno'
import type { RemoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  BRIGADA_NO_ACTIVA: 409,
  TURNO_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  TURNO_NO_ENCONTRADO: 'El turno solicitado no existe.',
}

function serializeRemoveResult(result: RemoveResult) {
  return {
    eliminado: { id: result.eliminado.id, label: result.eliminado.label },
    llamado: result.llamado
      ? {
          id: result.llamado.id,
          label: result.llamado.label,
          paciente: { nombre: result.llamado.patient.nombre, edad: result.llamado.patient.edad },
          llamadoEn: result.llamado.llamadoEn,
        }
      : null,
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string; turnoId: string }> },
) {
  const { brigadeId, areaId, turnoId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const result = await new RemoveTurnoUseCase(repo).execute({
      brigadeId,
      areaId,
      turnoId,
      userId: user.id,
    })
    return ok(serializeRemoveResult(result))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: no TypeScript errors in the new route files

- [ ] **Step 4: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move/route.ts" "app/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove/route.ts"
git commit -m "feat(turnos): add POST /move and POST /remove route handlers"
```

---

## Task 10: GET /public/[brigadeId]/areas/[areaId] route handler

**Files:**

- Create: `app/api/v1/public/[brigadeId]/areas/[areaId]/route.ts`
- Delete: `app/api/v1/public/[brigadeId]/areas/[areaId]/.gitkeep` (replace with route.ts)

This route has no session. The dashboard token is read from the `token` query parameter.

- [ ] **Step 1: Create the public area queue route handler**

```typescript
// app/api/v1/public/[brigadeId]/areas/[areaId]/route.ts
import type { NextRequest } from 'next/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  AREA_NO_ENCONTRADA: 404,
  TOKEN_REQUERIDO: 400,
}

const ERROR_MESSAGES: Record<string, string> = {
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
  TOKEN_REQUERIDO: 'El token de acceso es requerido.',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string }> },
) {
  const { brigadeId, areaId } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return err('TOKEN_REQUERIDO', ERROR_MESSAGES.TOKEN_REQUERIDO, 400)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const queue = await new GetPublicAreaQueueUseCase(repo).execute({ brigadeId, areaId, token })
    return ok({
      area: { nombre: queue.area.nombre, prefijo: queue.area.prefijo, color: queue.area.color },
      turnoActual: queue.turnoActual,
      enEspera: queue.enEspera,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Remove the .gitkeep placeholder**

```bash
rm "app/api/v1/public/[brigadeId]/areas/[areaId]/.gitkeep"
```

- [ ] **Step 3: Run the full test suite**

```bash
bun run test
```

Expected: all tests pass (20 existing patients tests + 18 new turnos tests = 38+)

- [ ] **Step 4: Verify TypeScript build is clean**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "app/api/v1/public/[brigadeId]/areas/[areaId]/route.ts"
git rm "app/api/v1/public/[brigadeId]/areas/[areaId]/.gitkeep"
git commit -m "feat(turnos): add GET /public area queue route handler"
```
