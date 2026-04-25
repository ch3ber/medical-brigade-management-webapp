import { describe, it, expect } from 'vitest'
import { BrigadeMember, type BrigadeMemberProps } from '../../BrigadeMember'

const base: BrigadeMemberProps = {
  id: 'member-1',
  brigadeId: 'brigade-1',
  profileId: 'profile-1',
  email: 'staff@example.com',
  role: 'STAFF',
  generatedUsername: null,
  inviteToken: null,
  invitedAt: new Date('2026-01-01'),
  acceptedAt: new Date('2026-01-02'),
  retainAccessAfterClose: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('BrigadeMember', () => {
  describe('isPending', () => {
    it('returns true when acceptedAt is null', () => {
      const m = new BrigadeMember({ ...base, acceptedAt: null })
      expect(m.isPending()).toBe(true)
    })

    it('returns false when acceptedAt is set', () => {
      const m = new BrigadeMember(base)
      expect(m.isPending()).toBe(false)
    })
  })

  describe('hasGeneratedCredentials', () => {
    it('returns true when generatedUsername is set', () => {
      const m = new BrigadeMember({ ...base, generatedUsername: 'jperez' })
      expect(m.hasGeneratedCredentials()).toBe(true)
    })

    it('returns false when generatedUsername is null', () => {
      const m = new BrigadeMember(base)
      expect(m.hasGeneratedCredentials()).toBe(false)
    })
  })
})
