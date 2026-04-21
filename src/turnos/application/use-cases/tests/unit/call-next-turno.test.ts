import { describe, it, expect, vi } from 'vitest'
import { CallNextTurnoUseCase } from '@/src/turnos/application/use-cases/call-next-turno'
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
  atendido: null,
  llamado: { id: 'turno-2', label: 'D-2', patient: { nombre: 'Ana', edad: 30 }, llamadoEn: new Date() },
  enEspera: 3,
})

const baseDto = { brigadeId: 'brigade-1', areaId: 'area-1', userId: 'user-1' }

describe('CallNextTurnoUseCase', () => {
  it('throws SIN_PERMISO when user is not a brigade member', async () => {
    const repo = makeMockRepo({ getMemberRole: vi.fn().mockResolvedValue(null) })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade status is not ACTIVE', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'DRAFT' }),
    })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade not found', async () => {
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue(null),
    })
    await expect(new CallNextTurnoUseCase(repo).execute(baseDto)).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('delegates to repo.callNext and returns NextTurnoResult', async () => {
    const result = makeNextResult()
    const repo = makeMockRepo({
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
      findBrigadeStatus: vi.fn().mockResolvedValue({ status: 'ACTIVE' }),
      callNext: vi.fn().mockResolvedValue(result),
    })
    const res = await new CallNextTurnoUseCase(repo).execute(baseDto)
    expect(repo.callNext).toHaveBeenCalledWith('brigade-1', 'area-1')
    expect(res).toBe(result)
  })
})
