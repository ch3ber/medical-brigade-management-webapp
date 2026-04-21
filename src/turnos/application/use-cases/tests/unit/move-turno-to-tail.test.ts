import { describe, it, expect, vi } from 'vitest'
import { MoveTurnoToTailUseCase } from '@/src/turnos/application/use-cases/move-turno-to-tail'
import type { ITurnoRepository, MoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

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

const makeMoveResult = (): MoveResult => ({
  movido: { id: 'turno-1', label: 'D-8', vecesMovido: 1, nuevoOrden: 8 },
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-1', userId: 'user-1' }

describe('MoveTurnoToTailUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno is not in CALLED status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new MoveTurnoToTailUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.moveToTail and returns MoveResult', async () => {
    const result = makeMoveResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue({ id: 'turno-1' }),
      moveToTail: vi.fn().mockResolvedValue(result),
    })
    const res = await new MoveTurnoToTailUseCase(repo).execute(baseDto)
    expect(repo.moveToTail).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-1')
    expect(res).toBe(result)
  })
})
