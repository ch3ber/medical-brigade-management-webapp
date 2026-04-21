import { Turno } from '@/src/turnos/domain/entities/Turno'

const baseProps = {
  id: 'turno-1',
  brigadeId: 'brigade-1',
  areaId: 'area-1',
  patientId: 'patient-1',
  areaOrder: 3,
  status: 'WAITING',
  calledAt: null,
  servedAt: null,
  movedCount: 0,
  createdAt: new Date('2026-04-20'),
}

describe('Turno', () => {
  it('assigns all properties from props', () => {
    const turno = new Turno(baseProps)
    expect(turno.id).toBe('turno-1')
    expect(turno.brigadeId).toBe('brigade-1')
    expect(turno.areaId).toBe('area-1')
    expect(turno.patientId).toBe('patient-1')
    expect(turno.areaOrder).toBe(3)
    expect(turno.status).toBe('WAITING')
    expect(turno.calledAt).toBeNull()
    expect(turno.servedAt).toBeNull()
    expect(turno.movedCount).toBe(0)
  })

  it('accepts non-null calledAt and servedAt', () => {
    const calledAt = new Date('2026-04-20T10:00:00Z')
    const servedAt = new Date('2026-04-20T10:05:00Z')
    const turno = new Turno({ ...baseProps, calledAt, servedAt, status: 'SERVED' })
    expect(turno.calledAt).toBe(calledAt)
    expect(turno.servedAt).toBe(servedAt)
    expect(turno.status).toBe('SERVED')
  })
})
