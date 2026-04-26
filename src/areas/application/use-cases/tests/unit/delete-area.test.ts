import { DeleteAreaUseCase } from '@/src/areas/application/use-cases/delete-area'
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

function makeArea() {
  return new Area({
    id: 'area-1',
    brigadeId: 'brigade-1',
    name: 'Dental',
    prefix: 'D',
    color: '#4F86C6',
    patientLimit: null,
    order: 1,
    isActive: true,
    publicDashboardToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', userId: 'user-1' }

describe('DeleteAreaUseCase', () => {
  it('throws SIN_PERMISO when role is CO_DIRECTOR', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR') })

    await expect(new DeleteAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue('STAFF') })

    await expect(new DeleteAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })

    await expect(new DeleteAreaUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws AREA_NO_ENCONTRADA when area does not exist', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(null),
    })

    await expect(new DeleteAreaUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_NO_ENCONTRADA')
  })

  it('throws AREA_CON_TURNOS_ACTIVOS when area has WAITING or CALLED turnos', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      hasActiveTurnos: vi.fn().mockResolvedValue(true),
    })

    await expect(new DeleteAreaUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_CON_TURNOS_ACTIVOS')
  })

  it('soft-deletes area when director and no active turnos', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findById: vi.fn().mockResolvedValue(makeArea()),
      hasActiveTurnos: vi.fn().mockResolvedValue(false),
      softDelete: vi.fn().mockResolvedValue(undefined),
    })

    await new DeleteAreaUseCase(repo).execute(baseDto)

    expect(repo.softDelete).toHaveBeenCalledWith('area-1')
  })
})
