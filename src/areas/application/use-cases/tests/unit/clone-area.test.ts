import { CloneAreaUseCase } from '@/src/areas/application/use-cases/clone-area'
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
  targetBrigadeId: 'brigade-2',
}

describe('CloneAreaUseCase', () => {
  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue('STAFF') })

    await expect(new CloneAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new CloneAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws AREA_NO_ENCONTRADA when source area does not exist', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(null),
    })

    await expect(new CloneAreaUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_NO_ENCONTRADA')
  })

  it('creates new area in target brigade with source config', async () => {
    const cloned = makeArea({ id: 'area-2', brigadeId: 'brigade-2', order: 3 })
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      getMaxOrder: vi.fn().mockResolvedValue(2),
      create: vi.fn().mockResolvedValue(cloned),
    })

    const result = await new CloneAreaUseCase(repo).execute(baseDto)

    expect(result).toBe(cloned)
    expect(repo.getMaxOrder).toHaveBeenCalledWith('brigade-2')
    expect(repo.create).toHaveBeenCalledWith({
      brigadeId: 'brigade-2',
      name: 'Dental',
      prefix: 'D',
      color: '#4F86C6',
      patientLimit: 50,
      order: 3,
    })
  })

  it('can clone area into the same brigade', async () => {
    const sameBrigadeDto = { ...baseDto, targetBrigadeId: 'brigade-1' }
    const cloned = makeArea({ id: 'area-2', order: 2 })
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      getMaxOrder: vi.fn().mockResolvedValue(1),
      create: vi.fn().mockResolvedValue(cloned),
    })

    const result = await new CloneAreaUseCase(repo).execute(sameBrigadeDto)

    expect(result).toBe(cloned)
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ brigadeId: 'brigade-1' }))
  })
})
