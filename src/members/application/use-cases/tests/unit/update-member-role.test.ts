import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateMemberRoleUseCase } from '../../update-member-role'
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

describe('UpdateMemberRoleUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('updates role when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember())
    vi.mocked(repo.update).mockResolvedValue(makeMember({ role: 'CO_DIRECTOR' }))

    const result = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'user-1',
      role: 'CO_DIRECTOR',
    })

    expect(result.role).toBe('CO_DIRECTOR')
    expect(repo.update).toHaveBeenCalledWith('member-1', {
      role: 'CO_DIRECTOR',
      retainAccessAfterClose: undefined,
    })
  })

  it('updates retainAccessAfterClose without changing role', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember())
    vi.mocked(repo.update).mockResolvedValue(makeMember({ retainAccessAfterClose: true }))

    const result = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'user-1',
      retainAccessAfterClose: true,
    })

    expect(result.retainAccessAfterClose).toBe(true)
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new UpdateMemberRoleUseCase(repo).execute({
        brigadeId: 'b',
        memberId: 'm',
        userId: 'u',
        role: 'CO_DIRECTOR',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when member does not exist', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(null)

    await expect(
      new UpdateMemberRoleUseCase(repo).execute({
        brigadeId: 'b',
        memberId: 'm',
        userId: 'u',
        role: 'CO_DIRECTOR',
      }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })
})
