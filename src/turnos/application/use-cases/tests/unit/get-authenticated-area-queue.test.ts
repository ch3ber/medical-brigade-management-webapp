import { GetAuthenticatedAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-authenticated-area-queue'
import type {
  ITurnoRepository,
  AuthenticatedAreaQueue,
} from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn(),
    callSpecific: vi.fn(),
    moveToTail: vi.fn(),
    remove: vi.fn(),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const mockQueue: AuthenticatedAreaQueue = {
  area: { id: 'area-1', nombre: 'Dental', prefijo: 'D', color: '#4F86C6' },
  turnoActual: { id: 't-1', label: 'D-5', patientName: 'María García', age: 35 },
  enEspera: [{ id: 't-2', label: 'D-6', patientName: 'Juan Pérez', age: 40 }],
  atendidos: [{ id: 't-0', label: 'D-4', patientName: 'Ana Torres' }],
}

describe('GetAuthenticatedAreaQueueUseCase', () => {
  it('returns queue when user has access', async () => {
    const repo = makeMockRepo({
      getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(mockQueue),
    })

    const result = await new GetAuthenticatedAreaQueueUseCase(repo).execute({
      brigadeId: 'brigade-1',
      areaId: 'area-1',
      userId: 'user-1',
    })

    expect(result).toBe(mockQueue)
    expect(repo.getAuthenticatedAreaQueue).toHaveBeenCalledWith('brigade-1', 'area-1', 'user-1')
  })

  it('throws AREA_NO_ENCONTRADA when area not found or no access', async () => {
    const repo = makeMockRepo({
      getAuthenticatedAreaQueue: vi.fn().mockResolvedValue(null),
    })

    await expect(
      new GetAuthenticatedAreaQueueUseCase(repo).execute({
        brigadeId: 'brigade-1',
        areaId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('AREA_NO_ENCONTRADA')
  })
})
