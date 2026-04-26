import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import type { IAreaRepository } from '@/src/areas/domain/repositories/IAreaRepository'
import { AreaWithCounts } from '@/src/areas/domain/entities/Area'

function makeMockRepo(overrides: Partial<IAreaRepository> = {}): IAreaRepository {
  return {
    findAllByBrigade: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    getMaxOrder: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(null),
    softDelete: vi.fn().mockResolvedValue(undefined),
    hasActiveTurnos: vi.fn().mockResolvedValue(false),
    ...overrides,
  }
}

function makeAreaWithCounts() {
  return new AreaWithCounts({
    id: 'area-1',
    brigadeId: 'brigade-1',
    name: 'Dental',
    prefix: 'D',
    color: '#4F86C6',
    patientLimit: 50,
    order: 1,
    isActive: true,
    publicDashboardToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    totalEnEspera: 3,
    totalAtendidos: 7,
  })
}

describe('ListAreasUseCase', () => {
  it('returns areas from repository', async () => {
    const areas = [makeAreaWithCounts()]
    const repo = makeMockRepo({ findAllByBrigade: vi.fn().mockResolvedValue(areas) })

    const result = await new ListAreasUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toBe(areas)
    expect(repo.findAllByBrigade).toHaveBeenCalledWith('brigade-1', 'user-1')
  })

  it('returns empty array when brigade has no areas', async () => {
    const repo = makeMockRepo({ findAllByBrigade: vi.fn().mockResolvedValue([]) })

    const result = await new ListAreasUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toEqual([])
  })
})
