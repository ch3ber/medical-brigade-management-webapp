import { describe, it, expect, vi } from 'vitest'
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
