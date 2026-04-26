import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListMembersUseCase } from '../../list-members'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = () =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: 'profile-1',
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    generatedPasswordHash: null,
    inviteToken: null,
    invitedAt: new Date(),
    acceptedAt: new Date(),
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('ListMembersUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('returns members when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    const members = [makeMember()]
    vi.mocked(repo.findAllByBrigade).mockResolvedValue(members)

    const result = await new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toEqual(members)
  })

  it('returns members when caller is CO_DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.findAllByBrigade).mockResolvedValue([])

    const result = await new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toEqual([])
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when caller has no brigade membership', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue(null)

    await expect(
      new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })
})
