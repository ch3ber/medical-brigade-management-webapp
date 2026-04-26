import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InviteMemberUseCase } from '../../invite-member'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    generatedPasswordHash: null,
    inviteToken: 'some-uuid',
    invitedAt: new Date(),
    acceptedAt: null,
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

describe('InviteMemberUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('creates invite member when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createInvite).mockResolvedValue(makeMember())

    const result = await new InviteMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      email: 'staff@example.com',
      role: 'STAFF',
    })

    expect(result.email).toBe('staff@example.com')
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        brigadeId: 'brigade-1',
        email: 'staff@example.com',
        role: 'STAFF',
        inviteToken: expect.any(String),
      }),
    )
  })

  it('works when caller is CO_DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createInvite).mockResolvedValue(makeMember())

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).resolves.toBeDefined()
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_YA_EXISTE when email already in brigade', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(true)

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).rejects.toThrow('MIEMBRO_YA_EXISTE')
  })
})
