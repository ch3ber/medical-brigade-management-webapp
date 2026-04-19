import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
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

function makeBrigade() {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('GetBrigadeUseCase', () => {
  it('returns the brigade when found', async () => {
    const brigade = makeBrigade()
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(brigade) })
    const useCase = new GetBrigadeUseCase(repo)

    const result = await useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toBe(brigade)
    expect(repo.findById).toHaveBeenCalledWith('brigade-1', 'user-1')
  })

  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(null) })
    const useCase = new GetBrigadeUseCase(repo)

    await expect(useCase.execute({ brigadeId: 'missing-id', userId: 'user-1' })).rejects.toThrow(
      'BRIGADA_NO_ENCONTRADA',
    )
  })
})
