import { CloneBrigadeUseCase } from '@/src/brigades/application/use-cases/clone-brigade'
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

function makeSourceBrigade() {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: 'Brigada original',
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status: 'ACTIVE',
    openedAt: new Date(),
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('CloneBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when source brigade not found', async () => {
    const repo = makeMockRepo()
    await expect(
      new CloneBrigadeUseCase(repo).execute({
        brigadeId: 'missing',
        userId: 'user-1',
        creatorEmail: 'user@example.com',
        name: 'Clon',
        date: '2026-09-01',
      }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    await expect(
      new CloneBrigadeUseCase(repo).execute({
        brigadeId: 'brigade-1',
        userId: 'user-1',
        creatorEmail: 'user@example.com',
        name: 'Clon',
        date: '2026-09-01',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('creates new DRAFT brigade with source location and description', async () => {
    const newBrigade = new Brigade({
      id: 'brigade-2',
      name: 'Clon',
      description: 'Brigada original',
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      create: vi.fn().mockResolvedValue(newBrigade),
    })

    const result = await new CloneBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      creatorEmail: 'user@example.com',
      name: 'Clon',
      date: '2026-09-01',
    })

    expect(result).toBe(newBrigade)
    expect(repo.create).toHaveBeenCalledWith({
      name: 'Clon',
      description: 'Brigada original',
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      createdBy: 'user-1',
      creatorEmail: 'user@example.com',
    })
  })

  it('co-director can clone brigade', async () => {
    const newBrigade = new Brigade({
      id: 'brigade-2',
      name: 'Clon',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-09-01'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'user-1',
      createdAt: new Date(),
    })
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeSourceBrigade()),
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      create: vi.fn().mockResolvedValue(newBrigade),
    })

    const result = await new CloneBrigadeUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      creatorEmail: 'user@example.com',
      name: 'Clon',
      date: '2026-09-01',
    })

    expect(result).toBe(newBrigade)
  })
})
