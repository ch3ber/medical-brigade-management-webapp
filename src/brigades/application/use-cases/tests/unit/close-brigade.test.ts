import { CloseBrigadeUseCase } from '@/src/brigades/application/use-cases/close-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade(status: Brigade['status'] = 'ACTIVE') {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status,
    openedAt: status === 'ACTIVE' || status === 'CLOSED' ? new Date() : null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CloseBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo()
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_NO_ACTIVA when brigade is DRAFT', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_NO_ACTIVA')
  })

  it('throws BRIGADA_CERRADA when brigade is already CLOSED', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    await expect(
      new CloseBrigadeUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('closes brigade and sets closedAt when ACTIVE + director', async () => {
    const closedBrigade = new Brigade({
      id: 'brigade-1',
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-19'),
      status: 'CLOSED',
      openedAt: new Date(),
      closedAt: new Date(),
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      update: vi.fn().mockResolvedValue(closedBrigade),
    })

    const result = await new CloseBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
    })

    expect(result.status).toBe('CLOSED')
    expect(repo.update).toHaveBeenCalledWith(
      'brigade-1',
      expect.objectContaining({ status: 'CLOSED', closedAt: expect.any(Date) }),
    )
  })
})
