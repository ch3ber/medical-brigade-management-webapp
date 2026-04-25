import { CreateBrigadeUseCase } from '@/src/brigades/application/use-cases/create-brigade'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeMockRepo(overrides: Partial<IBrigadeRepository> = {}): IBrigadeRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    findAllByUserId: vi.fn().mockResolvedValue([]),
    getMemberRole: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  }
}

function makeBrigade() {
  return new Brigade({
    id: 'b-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-25'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CreateBrigadeUseCase', () => {
  it('creates a brigade and returns it', async () => {
    const brigade = makeBrigade()
    const repo = makeMockRepo({ create: vi.fn().mockResolvedValue(brigade) })

    const result = await new CreateBrigadeUseCase(repo).execute({
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      createdBy: 'user-1',
      creatorEmail: 'user@test.com',
    })

    expect(result).toBe(brigade)
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Brigada Norte',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      createdBy: 'user-1',
      creatorEmail: 'user@test.com',
    })
  })
})
