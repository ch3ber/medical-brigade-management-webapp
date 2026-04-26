# Areas API — Design Spec

**Date:** 2026-04-20  
**Scope:** Full areas domain slice: domain entity, repository interface, Prisma implementation, 5 use cases, 3 API route handlers, unit tests.

---

## Endpoints

| Method | Path                                                | Role                   | Status |
| ------ | --------------------------------------------------- | ---------------------- | ------ |
| GET    | `/api/v1/brigades/[brigadeId]/areas`                | Any member             | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/areas`                | Director / Co-director | 201    |
| PATCH  | `/api/v1/brigades/[brigadeId]/areas/[areaId]`       | Director / Co-director | 200    |
| DELETE | `/api/v1/brigades/[brigadeId]/areas/[areaId]`       | Director only          | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/areas/[areaId]/clone` | Director / Co-director | 201    |

---

## Domain layer

### `Area` entity (`src/areas/domain/entities/Area.ts`)

Properties (map directly to Prisma `Area` model):

- `id: string`
- `brigadeId: string`
- `name: string`
- `prefix: string` (max 4 chars)
- `color: string` (hex)
- `patientLimit: number | null`
- `order: number`
- `isActive: boolean`
- `publicDashboardToken: string | null`
- `createdAt: Date`
- `updatedAt: Date`

No business-rule methods needed on the entity itself — all validation is in use cases.

### `IAreaRepository` interface (`src/areas/domain/repositories/IAreaRepository.ts`)

```typescript
interface AreaWithCounts extends Area {
  totalEnEspera: number
  totalAtendidos: number
}

interface CreateAreaData {
  brigadeId: string
  name: string
  prefix: string
  color: string
  patientLimit: number | null
  order?: number
}

interface UpdateAreaData {
  name?: string
  prefix?: string
  color?: string
  patientLimit?: number | null
  order?: number
}

interface IAreaRepository {
  findAllByBrigade(brigadeId: string, userId: string): Promise<AreaWithCounts[]>
  findById(id: string, brigadeId: string): Promise<Area | null>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  getMaxOrder(brigadeId: string): Promise<number>
  create(data: CreateAreaData): Promise<Area>
  update(id: string, data: UpdateAreaData): Promise<Area>
  softDelete(id: string): Promise<void>
  hasActiveTurnos(id: string): Promise<boolean>
}
```

`BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'` — same type used in brigades slice, redefined locally to avoid cross-slice import.

`getMemberRole` replicates the brigades repo query (checks `AppRole.PLATFORM_ADMIN` + `BrigadeMember.role`). No cross-slice import — each slice is self-contained.

---

## Application layer

### Use cases

All use cases follow the same pattern: class with `execute(dto)`, throw `Error('ERROR_CODE')` on failure.

#### `list-areas.ts`

- Input: `{ brigadeId, userId }`
- Calls `repo.findAllByBrigade(brigadeId, userId)`
- No role restriction — any brigade member
- Returns `AreaWithCounts[]`

#### `create-area.ts`

- Input: `{ brigadeId, userId, name, prefix, color, patientLimit?, order? }`
- Role check: Director or Co-director → `SIN_PERMISO` if not
- If `order` not provided: `order = (await repo.getMaxOrder(brigadeId)) + 1`
- Calls `repo.create(data)`
- Returns `Area`

#### `update-area.ts`

- Input: `{ brigadeId, areaId, userId, data: UpdateAreaData }`
- Role check: Director or Co-director → `SIN_PERMISO`
- Existence check: `repo.findById(areaId, brigadeId)` → `AREA_NO_ENCONTRADA` if null
- Calls `repo.update(areaId, data)`
- Returns `Area`

#### `delete-area.ts`

- Input: `{ brigadeId, areaId, userId }`
- Role check: Director only → `SIN_PERMISO`
- Existence check → `AREA_NO_ENCONTRADA` if null
- Active turnos check: `repo.hasActiveTurnos(areaId)` → `AREA_CON_TURNOS_ACTIVOS` (409) if true
- Calls `repo.softDelete(areaId)`

#### `clone-area.ts`

- Input: `{ brigadeId, areaId, userId, targetBrigadeId }`
- Role check on source brigade: Director or Co-director → `SIN_PERMISO`
- Existence check → `AREA_NO_ENCONTRADA` if null
- Copies: `name`, `prefix`, `color`, `patientLimit`; order = max+1 in target brigade
- Calls `repo.create({ brigadeId: targetBrigadeId, name, prefix, color, patientLimit, order })`
- Returns new `Area`

---

## Infrastructure layer

### `PrismaAreaRepository` (`src/areas/infrastructure/prisma-area-repository.ts`)

- `findAllByBrigade`: query with `where: { brigadeId, isActive: true }`, `orderBy: { order: 'asc' }`, include `_count` for turnos filtered by status `WAITING` and `SERVED`
- `hasActiveTurnos`: count turnos with `status: { in: ['WAITING', 'CALLED'] }` for given areaId
- `getMaxOrder`: `aggregate({ _max: { order: true } })`
- `getMemberRole`: same logic as brigades repo — check `AppRole.PLATFORM_ADMIN` then `BrigadeMember.role`

---

## API route handlers

### `app/api/v1/brigades/[brigadeId]/areas/route.ts` — GET + POST

**GET**: auth → `ListAreasUseCase` → map to Spanish response shape  
**POST body (Zod)**:

```typescript
{
  nombre: z.string().min(1),
  prefijo: z.string().min(1).max(4),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  limitePacientes: z.number().int().positive().nullable().optional(),
  orden: z.number().int().positive().optional(),
}
```

### `app/api/v1/brigades/[brigadeId]/areas/[areaId]/route.ts` — PATCH + DELETE

**PATCH body**: same fields as POST, all optional  
**DELETE**: no body

### `app/api/v1/brigades/[brigadeId]/areas/[areaId]/clone/route.ts` — POST

**POST body**:

```typescript
{
  brigadaDestinoId: z.string().uuid(),
}
```

---

## Error codes (new)

| Code                      | HTTP | Message                                                                               |
| ------------------------- | ---- | ------------------------------------------------------------------------------------- |
| `AREA_CON_TURNOS_ACTIVOS` | 409  | El área tiene turnos activos. Atiende o elimina los turnos antes de eliminar el área. |

All existing codes from `07-api-routes.md` apply unchanged.

---

## Response shapes

### GET `/areas`

```typescript
{
  success: true,
  data: [
    {
      id: string,
      nombre: string,
      prefijo: string,
      color: string,
      limitePacientes: number | null,
      orden: number,
      activa: boolean,
      totalEnEspera: number,
      totalAtendidos: number,
    }
  ],
  errors: null
}
```

### POST `/areas` and PATCH `/areas/[areaId]`

```typescript
{
  success: true,
  data: {
    id: string,
    nombre: string,
    prefijo: string,
    color: string,
    limitePacientes: number | null,
    orden: number,
    activa: boolean,
  },
  errors: null
}
```

### DELETE `/areas/[areaId]`

```typescript
{ success: true, data: null, errors: null }
```

### POST `/areas/[areaId]/clone`

Returns same shape as POST `/areas` with `status: 201`.

---

## Tests

Unit tests only (mock repository). One test file per use case + one for the entity.

| Test file             | Location                                      |
| --------------------- | --------------------------------------------- |
| `Area.test.ts`        | `src/areas/domain/entities/tests/unit/`       |
| `list-areas.test.ts`  | `src/areas/application/use-cases/tests/unit/` |
| `create-area.test.ts` | `src/areas/application/use-cases/tests/unit/` |
| `update-area.test.ts` | `src/areas/application/use-cases/tests/unit/` |
| `delete-area.test.ts` | `src/areas/application/use-cases/tests/unit/` |
| `clone-area.test.ts`  | `src/areas/application/use-cases/tests/unit/` |

Each test mocks `IAreaRepository` and covers: happy path, role check failures, not-found errors, and edge cases specific to the use case.
