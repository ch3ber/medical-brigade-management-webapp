# Turnos API — Design Spec

**Date:** 2026-04-21
**Scope:** Full turnos domain slice: domain entity, result types, repository interface, 5 use cases, Prisma implementation with advisory locks, 5 API route handlers, unit tests.

---

## Endpoints

| Method | Path                                                                  | Auth               | Status |
| ------ | --------------------------------------------------------------------- | ------------------ | ------ |
| POST   | `/api/v1/brigades/[brigadeId]/areas/[areaId]/next`                    | STAFF+ (session)   | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call`   | STAFF+ (session)   | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move`   | STAFF+ (session)   | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove` | STAFF+ (session)   | 200    |
| GET    | `/api/v1/public/[brigadeId]/areas/[areaId]`                           | Token (no session) | 200    |

All body-less POST endpoints accept an empty body `{}`.

---

## Domain layer

### `Turno` entity (`src/turnos/domain/entities/Turno.ts`)

```typescript
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
    /* assign all */
  }
}
```

### Result types and `ITurnoRepository` (`src/turnos/domain/repositories/ITurnoRepository.ts`)

```typescript
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

---

## Application layer

### Use cases

All follow the same pattern: class with `execute(dto)`, throw `Error('ERROR_CODE')` on failure.

#### `call-next-turno.ts`

- Input: `{ brigadeId, areaId, userId }`
- `getMemberRole` → `SIN_PERMISO` if null
- `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if status !== `'ACTIVE'` or null
- `callNext(brigadeId, areaId)` → returns `NextTurnoResult`

#### `call-specific-turno.ts`

- Input: `{ brigadeId, areaId, turnoId, userId }`
- `getMemberRole` → `SIN_PERMISO` if null
- `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if not ACTIVE
- `findWaitingTurno(turnoId, areaId)` → `TURNO_NO_ENCONTRADO` if null (covers both: turno not found AND turno not in WAITING status)
- `callSpecific(brigadeId, areaId, turnoId)` → returns `NextTurnoResult`

#### `move-turno-to-tail.ts`

- Input: `{ brigadeId, areaId, turnoId, userId }`
- `getMemberRole` → `SIN_PERMISO` if null
- `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if not ACTIVE
- `findCalledTurno(turnoId, areaId)` → `TURNO_NO_ENCONTRADO` if null (covers both: turno not found AND turno not CALLED)
- `moveToTail(brigadeId, areaId, turnoId)` → returns `MoveResult`

#### `remove-turno.ts`

- Input: `{ brigadeId, areaId, turnoId, userId }`
- `getMemberRole` → `SIN_PERMISO` if null
- `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if not ACTIVE
- `findCalledTurno(turnoId, areaId)` → `TURNO_NO_ENCONTRADO` if null
- `remove(brigadeId, areaId, turnoId)` → returns `RemoveResult`

#### `get-public-area-queue.ts`

- Input: `{ brigadeId, areaId, token }`
- No role check — public endpoint
- `getPublicAreaQueue(brigadeId, areaId, token)` → `AREA_NO_ENCONTRADA` if null (invalid token, wrong areaId, or wrong brigadeId)
- Returns `PublicAreaQueue`

---

## Infrastructure layer

### `PrismaPatientRepository` (`src/turnos/infrastructure/prisma-turno-repository.ts`)

**`getMemberRole`** — same logic as all other slices: check `AppRole.PLATFORM_ADMIN` → `'DIRECTOR'`; else return `brigadeMember.role`.

**`findBrigadeStatus`** — query `brigade.findFirst({ where: { id: brigadeId, members: { some: { profileId: userId } } }, select: { status: true } })`.

**`findWaitingTurno`** — `turno.findFirst({ where: { id: turnoId, areaId, status: TurnoStatus.WAITING } })`. Returns `{ id }` or null.

**`findCalledTurno`** — same but `status: TurnoStatus.CALLED`.

**`callNext`** — atomic transaction:

````typescript
prisma.$transaction(async (tx) => {
  // 1. Serve current CALLED turno (if any)
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

  // 2. Promote next WAITING turno
  const next = await tx.turno.findFirst({
    where: { areaId, status: TurnoStatus.WAITING },
    orderBy: { areaOrder: 'asc' },
    include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
  })
  let llamado: CalledTurnoInfo | null = null
  if (next) {
    const llamadoEn = new Date()
    await tx.turno.update({ where: { id: next.id }, data: { status: TurnoStatus.CALLED, calledAt: llamadoEn } })
    llamado = {
      id: next.id,
      label: `${next.area.prefix}-${next.areaOrder}`,
      patient: { nombre: next.patient.fullName, edad: next.patient.age },
      llamadoEn,
    }
  }

  // 3. Count remaining WAITING (next turno is already CALLED after the update above)
  const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

  return { atendido, llamado, enEspera }
})

**`callSpecific`** — atomic transaction:

```typescript
prisma.$transaction(async (tx) => {
  // 1. Serve any existing CALLED turno (skip if it's the same as target — shouldn't happen but defensive)
  const existing = await tx.turno.findFirst({
    where: { areaId, status: TurnoStatus.CALLED },
    include: { area: { select: { prefix: true } } },
  })
  let atendido: ServedTurnoInfo | null = null
  if (existing) {
    const servedAt = new Date()
    await tx.turno.update({ where: { id: existing.id }, data: { status: TurnoStatus.SERVED, servedAt } })
    atendido = { id: existing.id, label: `${existing.area.prefix}-${existing.areaOrder}`, atendidoEn: servedAt }
  }

  // 2. Promote target turno to CALLED
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

  // 3. Count remaining WAITING
  const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

  return { atendido, llamado, enEspera }
})
````

**`moveToTail`** — atomic transaction with advisory lock:

```typescript
prisma.$transaction(async (tx) => {
  // 1. Advisory lock for area order
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

  // 2. Get new areaOrder (tail position)
  const [{ max }] = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
  `
  const nuevoOrden = (max ?? 0) + 1

  // 3. Move turno to tail: status=WAITING, areaOrder=nuevoOrden, movedCount++
  const moved = await tx.turno.update({
    where: { id: turnoId },
    data: { status: TurnoStatus.WAITING, areaOrder: nuevoOrden, movedCount: { increment: 1 } },
    include: { area: { select: { prefix: true } } },
  })

  // 4. Promote next WAITING (lowest areaOrder, excluding the moved turno)
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
```

**`remove`** — atomic transaction:

```typescript
prisma.$transaction(async (tx) => {
  // 1. Mark turno as REMOVED
  const removed = await tx.turno.update({
    where: { id: turnoId },
    data: { status: TurnoStatus.REMOVED },
    include: { area: { select: { prefix: true } } },
  })

  // 2. Promote next WAITING
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
```

**`getPublicAreaQueue`**:

```typescript
async getPublicAreaQueue(brigadeId, areaId, token): Promise<PublicAreaQueue | null> {
  const area = await prisma.area.findFirst({
    where: { id: areaId, brigadeId, publicDashboardToken: token },
    select: { name: true, prefix: true, color: true },
  })
  if (!area) return null

  const [called, waiting] = await Promise.all([
    prisma.turno.findFirst({
      where: { areaId, status: TurnoStatus.CALLED },
      select: { areaOrder: true },
    }),
    prisma.turno.findMany({
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
```

---

## Advisory lock strategy

`moveToTail` uses `pg_advisory_xact_lock(hashtext('area_order_' + areaId))` — same pattern as patient registration. Released automatically at transaction end.

No advisory lock needed for `callNext`, `callSpecific`, or `remove` because those do not compute a new `areaOrder`.

---

## Error codes

| Code                  | HTTP | Message                                                 |
| --------------------- | ---- | ------------------------------------------------------- |
| `SIN_PERMISO`         | 403  | No tienes permiso para realizar esta acción.            |
| `BRIGADA_NO_ACTIVA`   | 409  | La brigada debe estar activa para realizar esta acción. |
| `TURNO_NO_ENCONTRADO` | 404  | El turno solicitado no existe.                          |
| `AREA_NO_ENCONTRADA`  | 404  | El área solicitada no existe.                           |

---

## Response shapes

### POST `/next` and POST `/turnos/[turnoId]/call`

```typescript
{
  success: true,
  data: {
    atendido: { id, label, atendidoEn } | null,
    llamado: { id, label, paciente: { nombre, edad }, llamadoEn } | null,
    enEspera: number
  }
}
```

### POST `/turnos/[turnoId]/move`

```typescript
{
  success: true,
  data: {
    movido: { id, label, vecesMovido, nuevoOrden },
    llamado: { id, label, paciente: { nombre, edad }, llamadoEn } | null
  }
}
```

### POST `/turnos/[turnoId]/remove`

```typescript
{
  success: true,
  data: {
    eliminado: { id, label },
    llamado: { id, label, paciente: { nombre, edad }, llamadoEn } | null
  }
}
```

### GET `/public/[brigadeId]/areas/[areaId]`

```typescript
{
  success: true,
  data: {
    area: { nombre, prefijo, color },
    turnoActual: { label } | null,
    enEspera: [{ label }]
  }
}
```

No patient names or personal data in public mode.

---

## Tests

Unit tests only (mock repository). One test file per use case + one for the entity.

| Test file                       | Location                                       |
| ------------------------------- | ---------------------------------------------- |
| `Turno.test.ts`                 | `src/turnos/domain/entities/tests/unit/`       |
| `call-next-turno.test.ts`       | `src/turnos/application/use-cases/tests/unit/` |
| `call-specific-turno.test.ts`   | `src/turnos/application/use-cases/tests/unit/` |
| `move-turno-to-tail.test.ts`    | `src/turnos/application/use-cases/tests/unit/` |
| `remove-turno.test.ts`          | `src/turnos/application/use-cases/tests/unit/` |
| `get-public-area-queue.test.ts` | `src/turnos/application/use-cases/tests/unit/` |

### Test cases per use case

**`call-next-turno`** (4 tests):

1. SIN_PERMISO when not member
2. BRIGADA_NO_ACTIVA when brigade not ACTIVE
3. Returns NextTurnoResult on happy path
4. Delegates correctly to `repo.callNext`

**`call-specific-turno`** (4 tests):

1. SIN_PERMISO when not member
2. BRIGADA_NO_ACTIVA
3. TURNO_NO_ENCONTRADO when `findWaitingTurno` returns null
4. Returns NextTurnoResult on happy path

**`move-turno-to-tail`** (4 tests):

1. SIN_PERMISO
2. BRIGADA_NO_ACTIVA
3. TURNO_NO_ENCONTRADO when `findCalledTurno` returns null
4. Returns MoveResult on happy path

**`remove-turno`** (4 tests):

1. SIN_PERMISO
2. BRIGADA_NO_ACTIVA
3. TURNO_NO_ENCONTRADO
4. Returns RemoveResult on happy path

**`get-public-area-queue`** (2 tests):

1. AREA_NO_ENCONTRADA when `getPublicAreaQueue` returns null
2. Returns PublicAreaQueue on happy path
