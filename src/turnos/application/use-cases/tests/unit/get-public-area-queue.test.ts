import { describe, it, expect, vi } from 'vitest'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'
import type { ITurnoRepository, PublicAreaQueue } from '@/src/turnos/domain/repositories/ITurnoRepository'

function makeMockRepo(overrides: Partial<ITurnoRepository> = {}): ITurnoRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findWaitingTurno: vi.fn().mockResolvedValue(null),
    findCalledTurno: vi.fn().mockResolvedValue(null),
    callNext: vi.fn().mockResolvedValue(null),
    callSpecific: vi.fn().mockResolvedValue(null),
    moveToTail: vi.fn().mockResolvedValue(null),
    remove: vi.fn().mockResolvedValue(null),
    getPublicAreaQueue: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

const makeQueue = (): PublicAreaQueue => ({
  area: { nombre: 'Dental', prefijo: 'D', color: '#3b82f6' },
  turnoActual: { label: 'D-3' },
  enEspera: [{ label: 'D-4' }, { label: 'D-5' }],
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', token: 'token-uuid' }

describe('GetPublicAreaQueueUseCase', () => {
  it('throws AREA_NO_ENCONTRADA when token/area/brigade mismatch', async () => {
    const repo = makeMockRepo({ getPublicAreaQueue: vi.fn().mockResolvedValue(null) })
    await expect(new GetPublicAreaQueueUseCase(repo).execute(baseDto)).rejects.toThrow('AREA_NO_ENCONTRADA')
  })

  it('returns PublicAreaQueue on valid token and area', async () => {
    const queue = makeQueue()
    const repo = makeMockRepo({ getPublicAreaQueue: vi.fn().mockResolvedValue(queue) })
    const res = await new GetPublicAreaQueueUseCase(repo).execute(baseDto)
    expect(repo.getPublicAreaQueue).toHaveBeenCalledWith('brigade-1', 'area-1', 'token-uuid')
    expect(res).toBe(queue)
  })
})
