import { describe, it, expect, vi } from 'vitest'
import { RemoveTurnoUseCase } from '@/src/turnos/application/use-cases/remove-turno'
import type { ITurnoRepository, RemoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

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

const makeRemoveResult = (): RemoveResult => ({
  eliminado: { id: 'turno-1', label: 'D-1' },
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-1', userId: 'user-1' }

describe('RemoveTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
    })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno is not in CALLED status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new RemoveTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.remove and returns RemoveResult', async () => {
    const result = makeRemoveResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findCalledTurno: vi.fn().mockResolvedValue({ id: 'turno-1' }),
      remove: vi.fn().mockResolvedValue(result),
    })
    const res = await new RemoveTurnoUseCase(repo).execute(baseDto)
    expect(repo.remove).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-1')
    expect(res).toBe(result)
  })
})
