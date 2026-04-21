import { CreateAreaUseCase } from '@/src/areas/application/use-cases/create-area'
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
  userId: 'user-1',
  name: 'Dental',
  prefix: 'D',
  color: '#4F86C6',
  patientLimit: 50,
}

describe('CreateAreaUseCase', () => {
  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue('STAFF') })

    await expect(new CreateAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new CreateAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('creates area with explicit order when provided', async () => {
    const area = makeArea({ order: 5 })
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      create: vi.fn().mockResolvedValue(area),
    })

    const result = await new CreateAreaUseCase(repo).execute({ ...baseDto, order: 5 })

    expect(result).toBe(area)
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ order: 5, brigadeId: 'brigade-1' }))
    expect(repo.getMaxOrder).not.toHaveBeenCalled()
  })

  it('derives order from max+1 when order not provided', async () => {
    const area = makeArea({ order: 4 })
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      getMaxOrder: vi.fn().mockResolvedValue(3),
      create: vi.fn().mockResolvedValue(area),
    })

    await new CreateAreaUseCase(repo).execute(baseDto)

    expect(repo.getMaxOrder).toHaveBeenCalledWith('brigade-1')
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ order: 4 }))
  })

  it('co-director can create area', async () => {
    const area = makeArea()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      create: vi.fn().mockResolvedValue(area),
    })

    const result = await new CreateAreaUseCase(repo).execute(baseDto)

    expect(result).toBe(area)
  })
})
