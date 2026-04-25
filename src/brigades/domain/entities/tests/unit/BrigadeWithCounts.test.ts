import { BrigadeWithCounts } from '@/src/brigades/domain/entities/Brigade'

describe('BrigadeWithCounts', () => {
  it('extends Brigade with patientsCount and areasCount', () => {
    const b = new BrigadeWithCounts({
      id: 'b-1',
      name: 'Test',
      description: null,
      location: 'Col. Norte',
      date: new Date('2026-04-25'),
      status: 'DRAFT',
      openedAt: null,
      closedAt: null,
      createdBy: 'u-1',
      createdAt: new Date(),
      patientsCount: 10,
      areasCount: 3,
    })
    expect(b.patientsCount).toBe(10)
    expect(b.areasCount).toBe(3)
    expect(b.id).toBe('b-1')
  })
})
