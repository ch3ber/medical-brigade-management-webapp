import { Brigade } from '@/src/brigades/domain/entities/Brigade'

function makeBrigade(overrides: Partial<ConstructorParameters<typeof Brigade>[0]> = {}) {
  return new Brigade({
    id: 'brigade-1',
    name: 'Brigada Norte',
    description: null,
    location: 'Col. Norte, Monterrey',
    date: new Date('2026-04-19'),
    status: 'DRAFT',
    openedAt: null,
    closedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2026-01-01'),
    ...overrides,
  })
}

describe('Brigade entity', () => {
  describe('canOpen()', () => {
    it('returns true when status is DRAFT', () => {
      const brigade = makeBrigade({ status: 'DRAFT' })
      expect(brigade.canOpen()).toBe(true)
    })

    it('returns false when status is ACTIVE', () => {
      const brigade = makeBrigade({ status: 'ACTIVE' })
      expect(brigade.canOpen()).toBe(false)
    })

    it('returns false when status is CLOSED', () => {
      const brigade = makeBrigade({ status: 'CLOSED' })
      expect(brigade.canOpen()).toBe(false)
    })
  })

  describe('canClose()', () => {
    it('returns true when status is ACTIVE', () => {
      const brigade = makeBrigade({ status: 'ACTIVE' })
      expect(brigade.canClose()).toBe(true)
    })

    it('returns false when status is DRAFT', () => {
      const brigade = makeBrigade({ status: 'DRAFT' })
      expect(brigade.canClose()).toBe(false)
    })

    it('returns false when status is CLOSED', () => {
      const brigade = makeBrigade({ status: 'CLOSED' })
      expect(brigade.canClose()).toBe(false)
    })
  })

  describe('isEditable()', () => {
    it('returns true when status is DRAFT', () => {
      expect(makeBrigade({ status: 'DRAFT' }).isEditable()).toBe(true)
    })

    it('returns true when status is ACTIVE', () => {
      expect(makeBrigade({ status: 'ACTIVE' }).isEditable()).toBe(true)
    })

    it('returns false when status is CLOSED', () => {
      expect(makeBrigade({ status: 'CLOSED' }).isEditable()).toBe(false)
    })
  })
})
