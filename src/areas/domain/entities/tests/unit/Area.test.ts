import { Area, AreaWithCounts } from '@/src/areas/domain/entities/Area'

const baseProps = {
  id: 'area-1',
  brigadeId: 'brigade-1',
  name: 'Dental',
  prefix: 'D',
  color: '#4F86C6',
  patientLimit: 50,
  order: 1,
  isActive: true,
  publicDashboardToken: 'token-uuid',
  createdAt: new Date('2026-04-20'),
  updatedAt: new Date('2026-04-20'),
}

describe('Area', () => {
  it('assigns all properties from props', () => {
    const area = new Area(baseProps)
    expect(area.id).toBe('area-1')
    expect(area.brigadeId).toBe('brigade-1')
    expect(area.name).toBe('Dental')
    expect(area.prefix).toBe('D')
    expect(area.color).toBe('#4F86C6')
    expect(area.patientLimit).toBe(50)
    expect(area.order).toBe(1)
    expect(area.isActive).toBe(true)
    expect(area.publicDashboardToken).toBe('token-uuid')
  })

  it('accepts null patientLimit', () => {
    const area = new Area({ ...baseProps, patientLimit: null })
    expect(area.patientLimit).toBeNull()
  })

  it('accepts null publicDashboardToken', () => {
    const area = new Area({ ...baseProps, publicDashboardToken: null })
    expect(area.publicDashboardToken).toBeNull()
  })
})

describe('AreaWithCounts', () => {
  it('inherits Area properties and adds counts', () => {
    const area = new AreaWithCounts({ ...baseProps, totalEnEspera: 5, totalAtendidos: 10 })
    expect(area.name).toBe('Dental')
    expect(area.totalEnEspera).toBe(5)
    expect(area.totalAtendidos).toBe(10)
  })
})
