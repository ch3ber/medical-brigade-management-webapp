import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerateStaffCredentialsUseCase } from '../../generate-staff-credentials'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: 'jperez',
    generatedPasswordHash: '$2b$12$hash',
    inviteToken: null,
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

describe('GenerateStaffCredentialsUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('creates credential member with role STAFF when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createWithCredentials).mockResolvedValue(makeMember())

    const result = await new GenerateStaffCredentialsUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      email: 'staff@example.com',
      generatedUsername: 'jperez',
      plainPassword: 'secret123',
    })

    expect(result.role).toBe('STAFF')
    expect(repo.createWithCredentials).toHaveBeenCalledWith({
      brigadeId: 'brigade-1',
      email: 'staff@example.com',
      generatedUsername: 'jperez',
      plainPassword: 'secret123',
      role: 'STAFF',
    })
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId: 'b',
        userId: 'u',
        email: 'x@x.com',
        generatedUsername: 'u',
        plainPassword: 'p',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_YA_EXISTE when email already in brigade', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(true)

    await expect(
      new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId: 'b',
        userId: 'u',
        email: 'x@x.com',
        generatedUsername: 'u',
        plainPassword: 'p',
      }),
    ).rejects.toThrow('MIEMBRO_YA_EXISTE')
  })
})
