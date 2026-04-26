import { describe, it, expect, vi } from 'vitest'
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
