# Patients API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full patients domain slice — entity, TurnoInfo type, repository interface, 4 use cases, Prisma implementation with advisory locks, and 3 API route handlers.

**Architecture:** Clean Architecture + Vertical Slicing. Domain in `src/patients/domain/`, use cases in `src/patients/application/`, Prisma implementation in `src/patients/infrastructure/`, API handlers in `app/api/v1/brigades/[brigadeId]/patients/`. `TurnoInfo` and `PatientWithTurnos` are defined in the patients domain (no cross-slice import from turnos/). Advisory locks via `prisma.$transaction` + `tx.$executeRaw` with `pg_advisory_xact_lock(hashtext(...))`.

**Tech Stack:** TypeScript 5, Prisma 5, Zod, Vitest, Next.js 14 App Router, Supabase Auth, PostgreSQL advisory locks.

---

## File Map

| File                                                                        | Action |
| --------------------------------------------------------------------------- | ------ |
| `src/patients/domain/entities/Patient.ts`                                   | Create |
| `src/patients/domain/entities/tests/unit/Patient.test.ts`                   | Create |
| `src/patients/domain/repositories/IPatientRepository.ts`                    | Create |
| `src/patients/application/use-cases/list-patients.ts`                       | Create |
| `src/patients/application/use-cases/tests/unit/list-patients.test.ts`       | Create |
| `src/patients/application/use-cases/register-patient.ts`                    | Create |
| `src/patients/application/use-cases/tests/unit/register-patient.test.ts`    | Create |
| `src/patients/application/use-cases/get-patient-detail.ts`                  | Create |
| `src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts`  | Create |
| `src/patients/application/use-cases/add-patient-to-area.ts`                 | Create |
| `src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts` | Create |
| `src/patients/infrastructure/prisma-patient-repository.ts`                  | Create |
| `app/api/v1/brigades/[brigadeId]/patients/route.ts`                         | Create |
| `app/api/v1/brigades/[brigadeId]/patients/[patientId]/route.ts`             | Create |
| `app/api/v1/brigades/[brigadeId]/patients/[patientId]/areas/route.ts`       | Create |

---

## Task 1: Patient entity, TurnoInfo, and PatientWithTurnos

**Files:**

- Create: `src/patients/domain/entities/Patient.ts`
- Create: `src/patients/domain/entities/tests/unit/Patient.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/patients/domain/entities/tests/unit/Patient.test.ts
import { Patient } from '@/src/patients/domain/entities/Patient'

const baseProps = {
  id: 'patient-1',
  brigadeId: 'brigade-1',
  fullName: 'María García',
  age: 45,
  gender: 'female',
  phone: '81-1234-5678',
  address: 'Calle Roble 12',
  wantsChurchVisit: false,
  globalOrder: 3,
  registeredBy: 'user-1',
  createdAt: new Date('2026-04-20'),
}

describe('Patient', () => {
  it('assigns all properties from props', () => {
    const patient = new Patient(baseProps)
    expect(patient.id).toBe('patient-1')
    expect(patient.brigadeId).toBe('brigade-1')
    expect(patient.fullName).toBe('María García')
    expect(patient.age).toBe(45)
    expect(patient.gender).toBe('female')
    expect(patient.phone).toBe('81-1234-5678')
    expect(patient.address).toBe('Calle Roble 12')
    expect(patient.wantsChurchVisit).toBe(false)
    expect(patient.globalOrder).toBe(3)
    expect(patient.registeredBy).toBe('user-1')
  })

  it('accepts wantsChurchVisit true', () => {
    const patient = new Patient({ ...baseProps, wantsChurchVisit: true })
    expect(patient.wantsChurchVisit).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/patients/domain/entities/tests/unit/Patient.test.ts
```

Expected: FAIL — `Patient` not found.

- [ ] **Step 3: Implement the entity**

```typescript
// src/patients/domain/entities/Patient.ts
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
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.fullName = props.fullName
    this.age = props.age
    this.gender = props.gender
    this.phone = props.phone
    this.address = props.address
    this.wantsChurchVisit = props.wantsChurchVisit
    this.globalOrder = props.globalOrder
    this.registeredBy = props.registeredBy
    this.createdAt = props.createdAt
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/patients/domain/entities/tests/unit/Patient.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/patients/domain/entities/Patient.ts src/patients/domain/entities/tests/unit/Patient.test.ts
git commit -m "feat(patients): add Patient entity, TurnoInfo, and PatientWithTurnos"
```

---

## Task 2: IPatientRepository interface

**Files:**

- Create: `src/patients/domain/repositories/IPatientRepository.ts`

No test — interfaces have no runtime behavior.

- [ ] **Step 1: Create the interface**

```typescript
// src/patients/domain/repositories/IPatientRepository.ts
import type { TurnoInfo, PatientWithTurnos } from '../entities/Patient'

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
  turnos: TurnoInfo[]
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

- [ ] **Step 2: Commit**

```bash
git add src/patients/domain/repositories/IPatientRepository.ts
git commit -m "feat(patients): add IPatientRepository interface"
```

---

## Task 3: list-patients use case

**Files:**

- Create: `src/patients/application/use-cases/list-patients.ts`
- Create: `src/patients/application/use-cases/tests/unit/list-patients.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/patients/application/use-cases/tests/unit/list-patients.test.ts
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import type { IPatientRepository } from '@/src/patients/domain/repositories/IPatientRepository'

function makeMockRepo(overrides: Partial<IPatientRepository> = {}): IPatientRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findAreaLimits: vi.fn().mockResolvedValue([]),
    registerPatient: vi.fn().mockResolvedValue(null),
    findAllByBrigade: vi.fn().mockResolvedValue({ patients: [], total: 0, pagina: 1, limite: 50 }),
    findById: vi.fn().mockResolvedValue(null),
    addToArea: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('ListPatientsUseCase', () => {
  it('returns paginated result from repository', async () => {
    const paginatedResult = { patients: [], total: 0, pagina: 1, limite: 50 }
    const repo = makeMockRepo({ findAllByBrigade: vi.fn().mockResolvedValue(paginatedResult) })
    const filters = { pagina: 1, limite: 50 }

    const result = await new ListPatientsUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      filters,
    })

    expect(result).toBe(paginatedResult)
    expect(repo.findAllByBrigade).toHaveBeenCalledWith('brigade-1', 'user-1', filters)
  })

  it('passes filters to repository', async () => {
    const repo = makeMockRepo()
    const filters = { areaId: 'area-1', status: 'WAITING', busqueda: 'María', pagina: 2, limite: 25 }

    await new ListPatientsUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1', filters })

    expect(repo.findAllByBrigade).toHaveBeenCalledWith('brigade-1', 'user-1', filters)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/patients/application/use-cases/tests/unit/list-patients.test.ts
```

Expected: FAIL — `ListPatientsUseCase` not found.

- [ ] **Step 3: Implement the use case**

```typescript
// src/patients/application/use-cases/list-patients.ts
import type {
  IPatientRepository,
  ListPatientsFilters,
  PaginatedPatients,
} from '../../domain/repositories/IPatientRepository'

interface ListPatientsDto {
  brigadeId: string
  userId: string
  filters: ListPatientsFilters
}

export class ListPatientsUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, userId, filters }: ListPatientsDto): Promise<PaginatedPatients> {
    return this.repo.findAllByBrigade(brigadeId, userId, filters)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/patients/application/use-cases/tests/unit/list-patients.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/patients/application/use-cases/list-patients.ts src/patients/application/use-cases/tests/unit/list-patients.test.ts
git commit -m "feat(patients): add ListPatientsUseCase"
```

---

## Task 4: register-patient use case

**Files:**

- Create: `src/patients/application/use-cases/register-patient.ts`
- Create: `src/patients/application/use-cases/tests/unit/register-patient.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/patients/application/use-cases/tests/unit/register-patient.test.ts
import { RegisterPatientUseCase } from '@/src/patients/application/use-cases/register-patient'
import type {
  IPatientRepository,
  RegisterPatientResult,
  AreaLimit,
} from '@/src/patients/domain/repositories/IPatientRepository'

function makeMockRepo(overrides: Partial<IPatientRepository> = {}): IPatientRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findAreaLimits: vi.fn().mockResolvedValue([]),
    registerPatient: vi.fn().mockResolvedValue(null),
    findAllByBrigade: vi.fn().mockResolvedValue({ patients: [], total: 0, pagina: 1, limite: 50 }),
    findById: vi.fn().mockResolvedValue(null),
    addToArea: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makeAreaLimit(overrides: Partial<AreaLimit> = {}): AreaLimit {
  return {
    id: 'area-1',
    name: 'Dental',
    prefix: 'D',
    patientLimit: 50,
    currentCount: 10,
    ...overrides,
  }
}

function makeResult(): RegisterPatientResult {
  return {
    patient: { id: 'patient-1', fullName: 'María García', globalOrder: 5 },
    turnos: [
      {
        id: 'turno-1',
        areaId: 'area-1',
        areaName: 'Dental',
        areaPrefix: 'D',
        areaOrder: 11,
        status: 'WAITING',
        movedCount: 0,
      },
    ],
  }
}

const baseDto = {
  brigadeId: 'brigade-1',
  userId: 'user-1',
  fullName: 'María García',
  age: 45,
  gender: 'female',
  phone: '81-1234-5678',
  address: 'Calle Roble 12',
  wantsChurchVisit: false,
  areaIds: ['area-1'],
}

describe('RegisterPatientUseCase', () => {
  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new RegisterPatientUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not found', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue(null),
    })

    await expect(new RegisterPatientUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade is DRAFT', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
    })

    await expect(new RegisterPatientUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade is CLOSED', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })

    await expect(new RegisterPatientUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws LIMITE_AREA_ALCANZADO when area is at patient limit', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit({ patientLimit: 10, currentCount: 10 })]),
    })

    await expect(new RegisterPatientUseCase(repo).execute(baseDto)).rejects.toThrow('LIMITE_AREA_ALCANZADO')
  })

  it('does not throw LIMITE_AREA_ALCANZADO when area has null limit (unlimited)', async () => {
    const result = makeResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit({ patientLimit: null, currentCount: 9999 })]),
      registerPatient: vi.fn().mockResolvedValue(result),
    })

    const res = await new RegisterPatientUseCase(repo).execute(baseDto)
    expect(res).toBe(result)
  })

  it('calls registerPatient with correct data including registeredBy = userId', async () => {
    const result = makeResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit()]),
      registerPatient: vi.fn().mockResolvedValue(result),
    })

    await new RegisterPatientUseCase(repo).execute(baseDto)

    expect(repo.registerPatient).toHaveBeenCalledWith({
      brigadeId: 'brigade-1',
      fullName: 'María García',
      age: 45,
      gender: 'female',
      phone: '81-1234-5678',
      address: 'Calle Roble 12',
      wantsChurchVisit: false,
      areaIds: ['area-1'],
      registeredBy: 'user-1',
    })
  })

  it('STAFF role can register patients', async () => {
    const result = makeResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit()]),
      registerPatient: vi.fn().mockResolvedValue(result),
    })

    const res = await new RegisterPatientUseCase(repo).execute(baseDto)
    expect(res).toBe(result)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/patients/application/use-cases/tests/unit/register-patient.test.ts
```

Expected: FAIL — `RegisterPatientUseCase` not found.

- [ ] **Step 3: Implement the use case**

```typescript
// src/patients/application/use-cases/register-patient.ts
import type { IPatientRepository, RegisterPatientResult } from '../../domain/repositories/IPatientRepository'

interface RegisterPatientDto {
  brigadeId: string
  userId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  areaIds: string[]
}

export class RegisterPatientUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({
    brigadeId,
    userId,
    fullName,
    age,
    gender,
    phone,
    address,
    wantsChurchVisit,
    areaIds,
  }: RegisterPatientDto): Promise<RegisterPatientResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const areaLimits = await this.repo.findAreaLimits(areaIds, brigadeId)
    for (const area of areaLimits) {
      if (area.patientLimit !== null && area.currentCount >= area.patientLimit) {
        throw new Error('LIMITE_AREA_ALCANZADO')
      }
    }

    return this.repo.registerPatient({
      brigadeId,
      fullName,
      age,
      gender,
      phone,
      address,
      wantsChurchVisit,
      areaIds,
      registeredBy: userId,
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/patients/application/use-cases/tests/unit/register-patient.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/patients/application/use-cases/register-patient.ts src/patients/application/use-cases/tests/unit/register-patient.test.ts
git commit -m "feat(patients): add RegisterPatientUseCase"
```

---

## Task 5: get-patient-detail use case

**Files:**

- Create: `src/patients/application/use-cases/get-patient-detail.ts`
- Create: `src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts
import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'
import type { IPatientRepository } from '@/src/patients/domain/repositories/IPatientRepository'
import type { PatientWithTurnos } from '@/src/patients/domain/entities/Patient'

function makeMockRepo(overrides: Partial<IPatientRepository> = {}): IPatientRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findAreaLimits: vi.fn().mockResolvedValue([]),
    registerPatient: vi.fn().mockResolvedValue(null),
    findAllByBrigade: vi.fn().mockResolvedValue({ patients: [], total: 0, pagina: 1, limite: 50 }),
    findById: vi.fn().mockResolvedValue(null),
    addToArea: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makePatientWithTurnos(): PatientWithTurnos {
  return {
    id: 'patient-1',
    brigadeId: 'brigade-1',
    fullName: 'María García',
    age: 45,
    gender: 'female',
    phone: '81-1234-5678',
    address: 'Calle Roble 12',
    wantsChurchVisit: false,
    globalOrder: 3,
    registeredBy: 'user-1',
    createdAt: new Date(),
    turnos: [],
  }
}

describe('GetPatientDetailUseCase', () => {
  it('throws PACIENTE_NO_ENCONTRADO when patient not found', async () => {
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(null) })

    await expect(
      new GetPatientDetailUseCase(repo).execute({
        brigadeId: 'brigade-1',
        patientId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('PACIENTE_NO_ENCONTRADO')
  })

  it('returns patient with turnos when found', async () => {
    const patient = makePatientWithTurnos()
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(patient) })

    const result = await new GetPatientDetailUseCase(repo).execute({
      brigadeId: 'brigade-1',
      patientId: 'patient-1',
      userId: 'user-1',
    })

    expect(result).toBe(patient)
    expect(repo.findById).toHaveBeenCalledWith('patient-1', 'brigade-1', 'user-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts
```

Expected: FAIL — `GetPatientDetailUseCase` not found.

- [ ] **Step 3: Implement the use case**

```typescript
// src/patients/application/use-cases/get-patient-detail.ts
import type { IPatientRepository } from '../../domain/repositories/IPatientRepository'
import type { PatientWithTurnos } from '../../domain/entities/Patient'

interface GetPatientDetailDto {
  brigadeId: string
  patientId: string
  userId: string
}

export class GetPatientDetailUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, patientId, userId }: GetPatientDetailDto): Promise<PatientWithTurnos> {
    const patient = await this.repo.findById(patientId, brigadeId, userId)
    if (!patient) throw new Error('PACIENTE_NO_ENCONTRADO')
    return patient
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/patients/application/use-cases/get-patient-detail.ts src/patients/application/use-cases/tests/unit/get-patient-detail.test.ts
git commit -m "feat(patients): add GetPatientDetailUseCase"
```

---

## Task 6: add-patient-to-area use case

**Files:**

- Create: `src/patients/application/use-cases/add-patient-to-area.ts`
- Create: `src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts
import { AddPatientToAreaUseCase } from '@/src/patients/application/use-cases/add-patient-to-area'
import type { IPatientRepository, AreaLimit } from '@/src/patients/domain/repositories/IPatientRepository'
import type { TurnoInfo } from '@/src/patients/domain/entities/Patient'

function makeMockRepo(overrides: Partial<IPatientRepository> = {}): IPatientRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findAreaLimits: vi.fn().mockResolvedValue([]),
    registerPatient: vi.fn().mockResolvedValue(null),
    findAllByBrigade: vi.fn().mockResolvedValue({ patients: [], total: 0, pagina: 1, limite: 50 }),
    findById: vi.fn().mockResolvedValue(null),
    addToArea: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makeAreaLimit(overrides: Partial<AreaLimit> = {}): AreaLimit {
  return {
    id: 'area-1',
    name: 'Dental',
    prefix: 'D',
    patientLimit: 50,
    currentCount: 10,
    ...overrides,
  }
}

function makeTurnoInfo(): TurnoInfo {
  return {
    id: 'turno-1',
    areaId: 'area-1',
    areaName: 'Dental',
    areaPrefix: 'D',
    areaOrder: 11,
    status: 'WAITING',
    movedCount: 0,
  }
}

const baseDto = { brigadeId: 'brigade-1', patientId: 'patient-1', areaId: 'area-1', userId: 'user-1' }

describe('AddPatientToAreaUseCase', () => {
  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new AddPatientToAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not found', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue(null),
    })

    await expect(new AddPatientToAreaUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade is CLOSED', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })

    await expect(new AddPatientToAreaUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws LIMITE_AREA_ALCANZADO when area is at limit', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit({ patientLimit: 10, currentCount: 10 })]),
    })

    await expect(new AddPatientToAreaUseCase(repo).execute(baseDto)).rejects.toThrow('LIMITE_AREA_ALCANZADO')
  })

  it('calls addToArea and returns TurnoInfo', async () => {
    const turno = makeTurnoInfo()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit()]),
      addToArea: vi.fn().mockResolvedValue(turno),
    })

    const result = await new AddPatientToAreaUseCase(repo).execute(baseDto)

    expect(result).toBe(turno)
    expect(repo.addToArea).toHaveBeenCalledWith('brigade-1', 'patient-1', 'area-1')
  })

  it('does not throw when area has null limit (unlimited)', async () => {
    const turno = makeTurnoInfo()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findAreaLimits: vi.fn().mockResolvedValue([makeAreaLimit({ patientLimit: null, currentCount: 9999 })]),
      addToArea: vi.fn().mockResolvedValue(turno),
    })

    const result = await new AddPatientToAreaUseCase(repo).execute(baseDto)
    expect(result).toBe(turno)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts
```

Expected: FAIL — `AddPatientToAreaUseCase` not found.

- [ ] **Step 3: Implement the use case**

```typescript
// src/patients/application/use-cases/add-patient-to-area.ts
import type { IPatientRepository } from '../../domain/repositories/IPatientRepository'
import type { TurnoInfo } from '../../domain/entities/Patient'

interface AddPatientToAreaDto {
  brigadeId: string
  patientId: string
  areaId: string
  userId: string
}

export class AddPatientToAreaUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, patientId, areaId, userId }: AddPatientToAreaDto): Promise<TurnoInfo> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const [area] = await this.repo.findAreaLimits([areaId], brigadeId)
    if (area && area.patientLimit !== null && area.currentCount >= area.patientLimit) {
      throw new Error('LIMITE_AREA_ALCANZADO')
    }

    return this.repo.addToArea(brigadeId, patientId, areaId)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun run test src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/patients/application/use-cases/add-patient-to-area.ts src/patients/application/use-cases/tests/unit/add-patient-to-area.test.ts
git commit -m "feat(patients): add AddPatientToAreaUseCase"
```

---

## Task 7: PrismaPatientRepository

**Files:**

- Create: `src/patients/infrastructure/prisma-patient-repository.ts`

No unit test — requires a real database.

- [ ] **Step 1: Create the implementation**

```typescript
// src/patients/infrastructure/prisma-patient-repository.ts
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, TurnoStatus } from '@/shared/prisma/generated/enums'
import type { TurnoInfo, PatientWithTurnos } from '../domain/entities/Patient'
import type {
  IPatientRepository,
  BrigadeRole,
  RegisterPatientData,
  RegisterPatientResult,
  AreaLimit,
  ListPatientsFilters,
  PaginatedPatients,
} from '../domain/repositories/IPatientRepository'

export class PrismaPatientRepository implements IPatientRepository {
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

  async findAreaLimits(areaIds: string[], brigadeId: string): Promise<AreaLimit[]> {
    const [areas, counts] = await Promise.all([
      this.prisma.area.findMany({
        where: { id: { in: areaIds }, brigadeId },
        select: { id: true, name: true, prefix: true, patientLimit: true },
      }),
      this.prisma.turno.groupBy({
        by: ['areaId'],
        where: {
          areaId: { in: areaIds },
          status: { not: TurnoStatus.REMOVED },
        },
        _count: { _all: true },
      }),
    ])

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      prefix: area.prefix,
      patientLimit: area.patientLimit,
      currentCount: counts.find((c) => c.areaId === area.id)?._count._all ?? 0,
    }))
  }

  async registerPatient(data: RegisterPatientData): Promise<RegisterPatientResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`global_order_${data.brigadeId}`}))`

      const globalResult = await tx.$queryRaw<Array<{ max: number | null }>>`
        SELECT MAX(global_order) as max FROM patients WHERE brigade_id = ${data.brigadeId}::uuid
      `
      const globalOrder = (globalResult[0]?.max ?? 0) + 1

      const patient = await tx.patient.create({
        data: {
          brigadeId: data.brigadeId,
          fullName: data.fullName,
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          address: data.address,
          wantsChurchVisit: data.wantsChurchVisit,
          globalOrder,
          registeredBy: data.registeredBy,
        },
      })

      const turnoInfos: TurnoInfo[] = []
      for (const areaId of data.areaIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

        const areaResult = await tx.$queryRaw<Array<{ max: number | null }>>`
          SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
        `
        const areaOrder = (areaResult[0]?.max ?? 0) + 1

        const turno = await tx.turno.create({
          data: {
            brigadeId: data.brigadeId,
            areaId,
            patientId: patient.id,
            areaOrder,
            status: TurnoStatus.WAITING,
          },
        })

        const area = await tx.area.findUniqueOrThrow({
          where: { id: areaId },
          select: { name: true, prefix: true },
        })

        turnoInfos.push({
          id: turno.id,
          areaId: turno.areaId,
          areaName: area.name,
          areaPrefix: area.prefix,
          areaOrder: turno.areaOrder,
          status: turno.status,
          movedCount: turno.movedCount,
        })
      }

      return {
        patient: { id: patient.id, fullName: patient.fullName, globalOrder: patient.globalOrder },
        turnos: turnoInfos,
      }
    })
  }

  async findAllByBrigade(
    brigadeId: string,
    userId: string,
    filters: ListPatientsFilters,
  ): Promise<PaginatedPatients> {
    const where = {
      brigadeId,
      brigade: { members: { some: { profileId: userId } } },
      ...(filters.busqueda && {
        fullName: { contains: filters.busqueda, mode: 'insensitive' as const },
      }),
      ...((filters.areaId || filters.status) && {
        turnos: {
          some: {
            ...(filters.areaId && { areaId: filters.areaId }),
            ...(filters.status && { status: filters.status as TurnoStatus }),
          },
        },
      }),
    }

    const skip = (filters.pagina - 1) * filters.limite

    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: {
          turnos: {
            include: { area: { select: { name: true, prefix: true } } },
          },
        },
        orderBy: { globalOrder: 'asc' },
        skip,
        take: filters.limite,
      }),
      this.prisma.patient.count({ where }),
    ])

    return {
      patients: rows.map(toPatientWithTurnos),
      total,
      pagina: filters.pagina,
      limite: filters.limite,
    }
  }

  async findById(patientId: string, brigadeId: string, userId: string): Promise<PatientWithTurnos | null> {
    const row = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        brigadeId,
        brigade: { members: { some: { profileId: userId } } },
      },
      include: {
        turnos: {
          include: { area: { select: { name: true, prefix: true } } },
        },
      },
    })
    return row ? toPatientWithTurnos(row) : null
  }

  async addToArea(brigadeId: string, patientId: string, areaId: string): Promise<TurnoInfo> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

      const areaResult = await tx.$queryRaw<Array<{ max: number | null }>>`
        SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
      `
      const areaOrder = (areaResult[0]?.max ?? 0) + 1

      const turno = await tx.turno.create({
        data: { brigadeId, areaId, patientId, areaOrder, status: TurnoStatus.WAITING },
      })

      const area = await tx.area.findUniqueOrThrow({
        where: { id: areaId },
        select: { name: true, prefix: true },
      })

      return {
        id: turno.id,
        areaId: turno.areaId,
        areaName: area.name,
        areaPrefix: area.prefix,
        areaOrder: turno.areaOrder,
        status: turno.status,
        movedCount: turno.movedCount,
      }
    })
  }
}

type PrismaTurnoWithArea = {
  id: string
  areaId: string
  areaOrder: number
  status: string
  movedCount: number
  area: { name: string; prefix: string }
}

type PrismaPatientWithTurnos = {
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
  turnos: PrismaTurnoWithArea[]
}

function toPatientWithTurnos(row: PrismaPatientWithTurnos): PatientWithTurnos {
  return {
    id: row.id,
    brigadeId: row.brigadeId,
    fullName: row.fullName,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    wantsChurchVisit: row.wantsChurchVisit,
    globalOrder: row.globalOrder,
    registeredBy: row.registeredBy,
    createdAt: row.createdAt,
    turnos: row.turnos.map((t) => ({
      id: t.id,
      areaId: t.areaId,
      areaName: t.area.name,
      areaPrefix: t.area.prefix,
      areaOrder: t.areaOrder,
      status: t.status,
      movedCount: t.movedCount,
    })),
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | grep -i "patients" | head -20
```

Expected: No errors in patients files.

- [ ] **Step 3: Run all patients unit tests**

```bash
bun run test src/patients/
```

Expected: All pass.

- [ ] **Step 4: Commit**

```bash
git add src/patients/infrastructure/prisma-patient-repository.ts
git commit -m "feat(patients): add PrismaPatientRepository with advisory locks"
```

---

## Task 8: GET + POST /patients route

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/patients/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/patients/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { RegisterPatientUseCase } from '@/src/patients/application/use-cases/register-patient'
import type { TurnoInfo } from '@/src/patients/domain/entities/Patient'

const postSchema = z.object({
  nombreCompleto: z.string().min(1, 'El nombre completo es requerido.'),
  edad: z.number().int().positive('La edad debe ser un número positivo.'),
  genero: z.enum(['male', 'female', 'other'], { message: 'El género debe ser male, female u other.' }),
  telefono: z.string().min(1, 'El teléfono es requerido.'),
  direccion: z.string().min(1, 'La dirección es requerida.'),
  quiereVisitaIglesia: z.boolean(),
  areaIds: z.array(z.string().uuid()).min(1, 'Se requiere al menos un área.'),
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
  SIN_PERMISO: 403,
  PACIENTE_NO_ENCONTRADO: 404,
  BRIGADA_NO_ACTIVA: 409,
  LIMITE_AREA_ALCANZADO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  PACIENTE_NO_ENCONTRADO: 'El paciente solicitado no existe.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  LIMITE_AREA_ALCANZADO: 'El área ha alcanzado su límite de pacientes.',
}

function mapTurno(t: TurnoInfo, includeOrden = false) {
  return {
    id: t.id,
    areaId: t.areaId,
    areaNombre: t.areaName,
    label: `${t.areaPrefix}-${t.areaOrder}`,
    ...(includeOrden && { ordenArea: t.areaOrder }),
    status: t.status,
    vecesMovido: t.movedCount,
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const { searchParams } = new URL(req.url)
  const filters = {
    areaId: searchParams.get('areaId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    busqueda: searchParams.get('busqueda') ?? undefined,
    pagina: Math.max(1, Number(searchParams.get('pagina') ?? '1')),
    limite: Math.min(100, Math.max(1, Number(searchParams.get('limite') ?? '50'))),
  }

  try {
    const repo = new PrismaPatientRepository(prisma)
    const result = await new ListPatientsUseCase(repo).execute({ brigadeId, userId: user.id, filters })

    return ok({
      pacientes: result.patients.map((p) => ({
        id: p.id,
        nombreCompleto: p.fullName,
        edad: p.age,
        genero: p.gender,
        telefono: p.phone,
        direccion: p.address,
        quiereVisitaIglesia: p.wantsChurchVisit,
        ordenGlobal: p.globalOrder,
        registradoEn: p.createdAt.toISOString(),
        turnos: p.turnos.map((t) => mapTurno(t)),
      })),
      total: result.total,
      pagina: result.pagina,
      limite: result.limite,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  const { nombreCompleto, edad, genero, telefono, direccion, quiereVisitaIglesia, areaIds } = parsed.data

  try {
    const repo = new PrismaPatientRepository(prisma)
    const result = await new RegisterPatientUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      fullName: nombreCompleto,
      age: edad,
      gender: genero,
      phone: telefono,
      address: direccion,
      wantsChurchVisit: quiereVisitaIglesia,
      areaIds,
    })

    return ok(
      {
        paciente: {
          id: result.patient.id,
          nombreCompleto: result.patient.fullName,
          ordenGlobal: result.patient.globalOrder,
        },
        turnos: result.turnos.map((t) => ({
          id: t.id,
          areaId: t.areaId,
          areaNombre: t.areaName,
          label: `${t.areaPrefix}-${t.areaOrder}`,
          ordenArea: t.areaOrder,
          status: t.status,
        })),
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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/patients/route.ts"
git commit -m "feat(patients): add GET and POST /patients route handlers"
```

---

## Task 9: GET /patients/[patientId] route

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/patients/[patientId]/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/patients/[patientId]/route.ts
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  PACIENTE_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  PACIENTE_NO_ENCONTRADO: 'El paciente solicitado no existe.',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; patientId: string }> },
) {
  const { brigadeId, patientId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaPatientRepository(prisma)
    const patient = await new GetPatientDetailUseCase(repo).execute({
      brigadeId,
      patientId,
      userId: user.id,
    })

    return ok({
      id: patient.id,
      nombreCompleto: patient.fullName,
      edad: patient.age,
      genero: patient.gender,
      telefono: patient.phone,
      direccion: patient.address,
      quiereVisitaIglesia: patient.wantsChurchVisit,
      ordenGlobal: patient.globalOrder,
      registradoEn: patient.createdAt.toISOString(),
      turnos: patient.turnos.map((t) => ({
        id: t.id,
        areaId: t.areaId,
        areaNombre: t.areaName,
        label: `${t.areaPrefix}-${t.areaOrder}`,
        status: t.status,
        vecesMovido: t.movedCount,
      })),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/patients/[patientId]/route.ts"
git commit -m "feat(patients): add GET /patients/[patientId] route handler"
```

---

## Task 10: POST /patients/[patientId]/areas route

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/patients/[patientId]/areas/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/patients/[patientId]/areas/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { AddPatientToAreaUseCase } from '@/src/patients/application/use-cases/add-patient-to-area'

const postSchema = z.object({
  areaId: z.string().uuid('Debe ser un UUID válido.'),
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
  SIN_PERMISO: 403,
  AREA_NO_ENCONTRADA: 404,
  BRIGADA_NO_ACTIVA: 409,
  LIMITE_AREA_ALCANZADO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  LIMITE_AREA_ALCANZADO: 'El área ha alcanzado su límite de pacientes.',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; patientId: string }> },
) {
  const { brigadeId, patientId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  try {
    const repo = new PrismaPatientRepository(prisma)
    const turno = await new AddPatientToAreaUseCase(repo).execute({
      brigadeId,
      patientId,
      areaId: parsed.data.areaId,
      userId: user.id,
    })

    return ok(
      {
        id: turno.id,
        areaId: turno.areaId,
        areaNombre: turno.areaName,
        label: `${turno.areaPrefix}-${turno.areaOrder}`,
        ordenArea: turno.areaOrder,
        status: turno.status,
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

- [ ] **Step 2: Run all patients unit tests**

```bash
bun run test src/patients/
```

Expected: All pass.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run build 2>&1 | grep -E "error" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/patients/[patientId]/areas/route.ts"
git commit -m "feat(patients): add POST /patients/[patientId]/areas route handler"
```
