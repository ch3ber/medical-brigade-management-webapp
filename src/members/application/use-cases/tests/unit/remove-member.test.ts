import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RemoveMemberUseCase } from '../../remove-member'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: 'profile-2',
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
    ...overrides,
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

describe('RemoveMemberUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('removes a member when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: 'profile-2' }))
    vi.mocked(repo.delete).mockResolvedValue(undefined)

    await new RemoveMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'profile-1',
    })

    expect(repo.delete).toHaveBeenCalledWith('member-1')
  })

  it('can remove a pending invite (profileId null)', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: null }))
    vi.mocked(repo.delete).mockResolvedValue(undefined)

    await new RemoveMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'profile-1',
    })

    expect(repo.delete).toHaveBeenCalledWith('member-1')
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new RemoveMemberUseCase(repo).execute({ brigadeId: 'b', memberId: 'm', userId: 'u' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when member does not exist', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(null)

    await expect(
      new RemoveMemberUseCase(repo).execute({ brigadeId: 'b', memberId: 'm', userId: 'u' }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })

  it('throws NO_PUEDE_ELIMINARSE_A_SI_MISMO when removing self', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: 'profile-1' }))

    await expect(
      new RemoveMemberUseCase(repo).execute({
        brigadeId: 'brigade-1',
        memberId: 'member-1',
        userId: 'profile-1',
      }),
    ).rejects.toThrow('NO_PUEDE_ELIMINARSE_A_SI_MISMO')
  })
})
