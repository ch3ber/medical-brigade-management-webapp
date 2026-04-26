import { ListBrigadesUseCase } from '@/src/brigades/application/use-cases/list-brigades'
import type { IBrigadeRepository } from '@/src/brigades/domain/repositories/IBrigadeRepository'
import { BrigadeWithCounts } from '@/src/brigades/domain/entities/Brigade'

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

function makeBrigadeWithCounts() {
  return new BrigadeWithCounts({
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
    patientsCount: 0,
    areasCount: 0,
  })
}

describe('ListBrigadesUseCase', () => {
  it('returns all brigades for a user', async () => {
    const brigades = [makeBrigadeWithCounts()]
    const repo = makeMockRepo({ findAllByUserId: vi.fn().mockResolvedValue(brigades) })

    const result = await new ListBrigadesUseCase(repo).execute({ userId: 'user-1' })

    expect(result).toBe(brigades)
    expect(repo.findAllByUserId).toHaveBeenCalledWith('user-1')
  })

  it('returns empty array when user has no brigades', async () => {
    const repo = makeMockRepo({ findAllByUserId: vi.fn().mockResolvedValue([]) })

    const result = await new ListBrigadesUseCase(repo).execute({ userId: 'user-1' })

    expect(result).toEqual([])
  })
})
