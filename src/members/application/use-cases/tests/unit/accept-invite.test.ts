import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AcceptInviteUseCase } from '../../accept-invite'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makePending = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    generatedPasswordHash: null,
    inviteToken: 'valid-token',
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

describe('AcceptInviteUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('accepts a pending invite and returns updated member', async () => {
    const pending = makePending()
    const accepted = makePending({ profileId: 'profile-1', acceptedAt: new Date() })
    vi.mocked(repo.findByInviteToken).mockResolvedValue(pending)
    vi.mocked(repo.acceptInvite).mockResolvedValue(accepted)

    const result = await new AcceptInviteUseCase(repo).execute({
      token: 'valid-token',
      profileId: 'profile-1',
    })

    expect(result.profileId).toBe('profile-1')
    expect(result.acceptedAt).not.toBeNull()
    expect(repo.acceptInvite).toHaveBeenCalledWith('valid-token', 'profile-1')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when token does not exist', async () => {
    vi.mocked(repo.findByInviteToken).mockResolvedValue(null)

    await expect(
      new AcceptInviteUseCase(repo).execute({ token: 'bad-token', profileId: 'p' }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })

  it('throws INVITACION_YA_ACEPTADA when acceptedAt is already set', async () => {
    const already = makePending({ acceptedAt: new Date() })
    vi.mocked(repo.findByInviteToken).mockResolvedValue(already)

    await expect(
      new AcceptInviteUseCase(repo).execute({ token: 'valid-token', profileId: 'p' }),
    ).rejects.toThrow('INVITACION_YA_ACEPTADA')
  })
})
