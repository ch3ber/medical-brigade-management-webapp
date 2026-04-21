# Patients API — Design Spec

**Date:** 2026-04-20
**Scope:** Full patients domain slice: domain entity, TurnoInfo type, repository interface, Prisma implementation, 4 use cases, 3 API route handlers, unit tests.

---

## Endpoints

| Method | Path                                                      | Role                           | Status |
| ------ | --------------------------------------------------------- | ------------------------------ | ------ |
| GET    | `/api/v1/brigades/[brigadeId]/patients`                   | Any member                     | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/patients`                   | STAFF / CO_DIRECTOR / DIRECTOR | 201    |
| GET    | `/api/v1/brigades/[brigadeId]/patients/[patientId]`       | Any member                     | 200    |
| POST   | `/api/v1/brigades/[brigadeId]/patients/[patientId]/areas` | STAFF / CO_DIRECTOR / DIRECTOR | 201    |

---

## Domain layer

### `Patient` entity (`src/patients/domain/entities/Patient.ts`)

```typescript
export interface PatientProps {
  id: string
  brigadeId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  globalOrder: number
  registeredBy: string
  createdAt: Date
}

export class Patient {
  readonly id: string
  readonly brigadeId: string
  readonly fullName: string
  readonly age: number
  readonly gender: string
  readonly phone: string
  readonly address: string
  readonly wantsChurchVisit: boolean
  readonly globalOrder: number
  readonly registeredBy: string
  readonly createdAt: Date

  constructor(props: PatientProps) {
    /* assign all */
  }
}
```

### `TurnoInfo` type and `PatientWithTurnos` (`src/patients/domain/entities/Patient.ts`)

Defined alongside the entity — avoids cross-slice import from `turnos/`:

```typescript
export interface TurnoInfo {
  id: string
  areaId: string
  areaName: string
  areaPrefix: string
  areaOrder: number
  status: string
  movedCount: number
}

export interface PatientWithTurnos extends PatientProps {
  turnos: TurnoInfo[]
}
```

### `IPatientRepository` (`src/patients/domain/repositories/IPatientRepository.ts`)

```typescript
export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface RegisterPatientData {
  brigadeId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  areaIds: string[]
  registeredBy: string
}

export interface RegisterPatientResult {
  patient: {
    id: string
    fullName: string
    globalOrder: number
  }
  turnos: TurnoInfo[] // includes areaPrefix for label computation
}

export interface AreaLimit {
  id: string
  name: string
  prefix: string
  patientLimit: number | null
  currentCount: number
}

export interface ListPatientsFilters {
  areaId?: string
  status?: string
  busqueda?: string
  pagina: number
  limite: number
}

export interface PaginatedPatients {
  patients: PatientWithTurnos[]
  total: number
  pagina: number
  limite: number
}

export interface IPatientRepository {
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null>
  findAreaLimits(areaIds: string[], brigadeId: string): Promise<AreaLimit[]>
  registerPatient(data: RegisterPatientData): Promise<RegisterPatientResult>
  findAllByBrigade(
    brigadeId: string,
    userId: string,
    filters: ListPatientsFilters,
  ): Promise<PaginatedPatients>
  findById(patientId: string, brigadeId: string, userId: string): Promise<PatientWithTurnos | null>
  addToArea(brigadeId: string, patientId: string, areaId: string): Promise<TurnoInfo>
}
```

---

## Application layer

### Use cases

All follow the same pattern: class with `execute(dto)`, throw `Error('ERROR_CODE')` on failure.

#### `list-patients.ts`

- Input: `{ brigadeId, userId, filters: ListPatientsFilters }`
- Role: any member (membership validated implicitly by repo — returns empty if not member)
- Calls `repo.findAllByBrigade(brigadeId, userId, filters)`
- Returns `PaginatedPatients`

#### `register-patient.ts`

- Input: `{ brigadeId, userId, fullName, age, genero, telefono, direccion, quiereVisitaIglesia, areaIds }`
- Role check: `getMemberRole` → `SIN_PERMISO` if null (non-member gets null)
- Brigade check: `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if status !== `'ACTIVE'` or null
- Area limits: `findAreaLimits(areaIds, brigadeId)` → `LIMITE_AREA_ALCANZADO` if any area where `patientLimit !== null && currentCount >= patientLimit`
- Calls `repo.registerPatient(data)`
- Returns `RegisterPatientResult`

Note: `STAFF` role is allowed. The role check only blocks non-members (null role).

#### `get-patient-detail.ts`

- Input: `{ brigadeId, patientId, userId }`
- Calls `repo.findById(patientId, brigadeId, userId)`
- Throws `PACIENTE_NO_ENCONTRADO` if null
- Returns `PatientWithTurnos`

#### `add-patient-to-area.ts`

- Input: `{ brigadeId, patientId, areaId, userId }`
- Role check: `getMemberRole` → `SIN_PERMISO` if null
- Brigade check: `findBrigadeStatus` → `BRIGADA_NO_ACTIVA` if not ACTIVE
- Area limit: `findAreaLimits([areaId], brigadeId)` → `LIMITE_AREA_ALCANZADO` if at limit
- Calls `repo.addToArea(brigadeId, patientId, areaId)`
- Returns `TurnoInfo`

---

## Infrastructure layer

### `PrismaPatientRepository` (`src/patients/infrastructure/prisma-patient-repository.ts`)

**`getMemberRole`** — same logic as brigades/areas repos (PLATFORM_ADMIN check + brigadeMember query).

**`findBrigadeStatus`** — query brigade where `{ id: brigadeId, members: { some: { profileId: userId } } }`, return `{ status }` or null.

**`findAreaLimits`** — for each areaId: get area config + count of turnos where `status NOT IN [REMOVED]`. Returns `AreaLimit[]`.

Actually, patient limit counts active turnos (not removed): `currentCount = COUNT(turnos) WHERE areaId = X AND status NOT IN ('REMOVED')`.

**`registerPatient`** — atomic via `prisma.$transaction`:

```typescript
prisma.$transaction(async (tx) => {
  // 1. Lock global order for brigade
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`global_order_${brigadeId}`}))`

  // 2. Get next globalOrder
  const [{ max }] = await tx.$queryRaw<[{ max: number | null }]>`
    SELECT MAX(global_order) as max FROM patients WHERE brigade_id = ${brigadeId}::uuid
  `
  const globalOrder = (max ?? 0) + 1

  // 3. Create patient
  const patient = await tx.patient.create({ data: { ...data, globalOrder } })

  // 4. For each area: lock + get areaOrder + create turno
  const turnos = []
  for (const areaId of data.areaIds) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`
    const [{ max: areaMax }] = await tx.$queryRaw<[{ max: number | null }]>`
      SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
    `
    const areaOrder = (areaMax ?? 0) + 1
    const turno = await tx.turno.create({
      data: { brigadeId, areaId, patientId: patient.id, areaOrder, status: 'WAITING' },
    })
    turnos.push({ turno, areaId })
  }

  // 5. Fetch area info (name, prefix) for response
  const areas = await tx.area.findMany({ where: { id: { in: data.areaIds } }, select: { id, name, prefix } })

  return { patient, turnos, areas }
})
```

**`findAllByBrigade`** — `patient.findMany` with:

- `where: { brigadeId, brigade: { members: { some: { profileId: userId } } }, ...filters }`
- `busqueda` → `fullName: { contains: busqueda, mode: 'insensitive' }`
- `areaId/status` → filter via turno relation
- Include turnos with area select (id, name, prefix)
- Paginate with `skip` + `take` + `count`

**`findById`** — `patient.findFirst` with `include: { turnos: { include: { area: { select: { name, prefix } } } } }`, filtered by brigadeId and membership.

**`addToArea`** — `prisma.$transaction` with single area advisory lock + areaOrder computation + `turno.create`.

---

## Advisory lock strategy

- Global order lock key: `hashtext('global_order_' || brigadeId)`
- Area order lock key: `hashtext('area_order_' || areaId)`
- Both use `pg_advisory_xact_lock` (released automatically at transaction end)
- `$queryRaw` with typed generic to get MAX values

---

## Label computation

Labels are NOT stored in the DB. Computed in route handlers:

```typescript
const label = `${turno.areaPrefix}-${turno.areaOrder}` // e.g. "D-12"
```

---

## Error codes

All existing codes from `07-api-routes.md` apply. No new codes needed for patients.

Key codes used:

- `SIN_PERMISO` → 403
- `BRIGADA_NO_ACTIVA` → 409
- `LIMITE_AREA_ALCANZADO` → 409
- `PACIENTE_NO_ENCONTRADO` → 404
- `AREA_NO_ENCONTRADA` → 404

---

## Response shapes

### GET `/patients`

```typescript
{
  success: true,
  data: {
    pacientes: [{
      id, nombreCompleto, edad, genero, telefono, direccion,
      quiereVisitaIglesia, ordenGlobal, registradoEn,
      turnos: [{ id, areaId, areaNombre, label, status, vecesMovido }]
    }],
    total, pagina, limite
  }
}
```

### POST `/patients`

```typescript
{
  success: true,
  data: {
    paciente: { id, nombreCompleto, ordenGlobal },
    turnos: [{ id, areaId, areaNombre, label, ordenArea, status }]
  }
}
```

### GET `/patients/[patientId]`

Same shape as single item from GET list (patient + full turnos).

### POST `/patients/[patientId]/areas`

```typescript
{
  success: true,
  data: { id, areaId, areaNombre, label, ordenArea, status }
}
```

---

## POST /patients Zod schema

```typescript
z.object({
  nombreCompleto: z.string().min(1),
  edad: z.number().int().positive(),
  genero: z.enum(['male', 'female', 'other']),
  telefono: z.string().min(1),
  direccion: z.string().min(1),
  quiereVisitaIglesia: z.boolean(),
  areaIds: z.array(z.string().uuid()).min(1),
})
```

## POST /patients/[patientId]/areas Zod schema

```typescript
z.object({
  areaId: z.string().uuid(),
})
```

---

## Tests

Unit tests only (mock repository). One file per use case + entity.

| Test file                     | Location                                         |
| ----------------------------- | ------------------------------------------------ |
| `Patient.test.ts`             | `src/patients/domain/entities/tests/unit/`       |
| `list-patients.test.ts`       | `src/patients/application/use-cases/tests/unit/` |
| `register-patient.test.ts`    | `src/patients/application/use-cases/tests/unit/` |
| `get-patient-detail.test.ts`  | `src/patients/application/use-cases/tests/unit/` |
| `add-patient-to-area.test.ts` | `src/patients/application/use-cases/tests/unit/` |
