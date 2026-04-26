import { UpdateAreaUseCase } from '@/src/areas/application/use-cases/update-area'
import type { IAreaRepository } from '@/src/areas/domain/repositories/IAreaRepository'
import { Area } from '@/src/areas/domain/entities/Area'

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

function makeArea(overrides = {}) {
  return new Area({
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
    ...overrides,
  })
}

const baseDto = {
  brigadeId: 'brigade-1',
  areaId: 'area-1',
  userId: 'user-1',
  data: { name: 'Dental Updated' },
}

describe('UpdateAreaUseCase', () => {
  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue('STAFF') })

    await expect(new UpdateAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new UpdateAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws AREA_NO_ENCONTRADA when area does not exist', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(null),
    })

    await expect(new UpdateAreaUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_NO_ENCONTRADA')
  })

  it('updates and returns area', async () => {
    const updated = makeArea({ name: 'Dental Updated' })
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      update: vi.fn().mockResolvedValue(updated),
    })

    const result = await new UpdateAreaUseCase(repo).execute(baseDto)

    expect(result).toBe(updated)
    expect(repo.update).toHaveBeenCalledWith('area-1', { name: 'Dental Updated' })
  })

  it('co-director can update area', async () => {
    const updated = makeArea()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      update: vi.fn().mockResolvedValue(updated),
    })

    const result = await new UpdateAreaUseCase(repo).execute(baseDto)

    expect(result).toBe(updated)
  })
})
