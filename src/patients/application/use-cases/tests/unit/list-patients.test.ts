import { describe, it, expect, vi } from 'vitest'
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
