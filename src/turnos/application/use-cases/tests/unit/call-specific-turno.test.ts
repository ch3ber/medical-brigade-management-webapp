import { describe, it, expect, vi } from 'vitest'
import { CallSpecificTurnoUseCase } from '@/src/turnos/application/use-cases/call-specific-turno'
import type { ITurnoRepository, NextTurnoResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

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

const makeNextResult = (): NextTurnoResult => ({
  atendido: { id: 'turno-1', label: 'D-1', atendidoEn: new Date() },
  llamado: { id: 'turno-5', label: 'D-5', patient: { nombre: 'Carlos', edad: 40 }, llamadoEn: new Date() },
  enEspera: 2,
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', turnoId: 'turno-5', userId: 'user-1' }

describe('CallSpecificTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not active', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'CLOSED' }),
    })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not found', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue(null),
    })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws TURNO_NO_ENCONTRADO when turno not in WAITING status', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findWaitingTurno: vi.fn().mockResolvedValue(null),
    })
    await expect(new CallSpecificTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('TURNO_NO_ENCONTRADO')
  })

  it('delegates to repo.callSpecific and returns NextTurnoResult', async () => {
    const result = makeNextResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      findWaitingTurno: vi.fn().mockResolvedValue({ id: 'turno-5' }),
      callSpecific: vi.fn().mockResolvedValue(result),
    })
    const res = await new CallSpecificTurnoUseCase(repo).execute(baseDto)
    expect(repo.callSpecific).toHaveBeenCalledWith('brigade-1', 'area-1', 'turno-5')
    expect(res).toBe(result)
  })
})
