import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'
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

function makeBrigade(status: Brigade['status'] = 'DRAFT') {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte',
    date: new Date('2026-04-19'),
    status,
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date(),
  })
}

describe('UpdateBrigadeUseCase', () => {
  it('throws BRIGADA_NO_ENCONTRADA when brigade not found', async () => {
    const repo = makeMockRepo()
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'missing', userId: 'user-1', data: { name: 'New Name' } }),
    ).rejects.toThrow('BRIGADA_NO_ENCONTRADA')
  })

  it('throws SIN_PERMISO when role is STAFF regardless of brigade status', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws BRIGADA_CERRADA when brigade is CLOSED and user is director', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('CLOSED')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('BRIGADA_CERRADA')
  })

  it('throws SIN_PERMISO when member role is STAFF', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('STAFF'),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when user is not a member (role is null)', async () => {
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue(null),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    await expect(
      useCase.execute({ brigadeId: 'brigade-1', userId: 'user-1', data: { name: 'New' } }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('updates brigade when director', async () => {
    const updated = makeBrigade('DRAFT')
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('DRAFT')),
      getMemberRole: vi.fn().mockResolvedValue('DIRECTOR'),
      update: vi.fn().mockResolvedValue(updated),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    const result = await useCase.execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      data: { name: 'New Name' },
    })

    expect(result).toBe(updated)
    expect(repo.update).toHaveBeenCalledWith('brigade-1', { name: 'New Name' })
  })

  it('updates brigade when co-director', async () => {
    const updated = makeBrigade('ACTIVE')
    const repo = makeMockRepo({
      findById: vi.fn().mockResolvedValue(makeBrigade('ACTIVE')),
      getMemberRole: vi.fn().mockResolvedValue('CO_DIRECTOR'),
      update: vi.fn().mockResolvedValue(updated),
    })
    const useCase = new UpdateBrigadeUseCase(repo)

    const result = await useCase.execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      data: { location: 'New Location' },
    })

    expect(result).toBe(updated)
  })
})
