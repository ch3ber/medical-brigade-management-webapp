import { Patient } from '@/src/patients/domain/entities/Patient'

const baseProps = {
  id: 'patient-1',
  brigadeId: 'brigade-1',
  fullName: 'María García',
  age: 45,
  gender: 'female',
  phone: '81-1234-5678',
  address: 'Calle Roble 12',
  wantsChurchVisit: false,
  globalOrder: 3,
  registeredBy: 'user-1',
  createdAt: new Date('2026-04-20'),
}

describe('Patient', () => {
  it('assigns all properties from props', () => {
    const patient = new Patient(baseProps)
    expect(patient.id).toBe('patient-1')
    expect(patient.brigadeId).toBe('brigade-1')
    expect(patient.fullName).toBe('María García')
    expect(patient.age).toBe(45)
    expect(patient.gender).toBe('female')
    expect(patient.phone).toBe('81-1234-5678')
    expect(patient.address).toBe('Calle Roble 12')
    expect(patient.wantsChurchVisit).toBe(false)
    expect(patient.globalOrder).toBe(3)
    expect(patient.registeredBy).toBe('user-1')
  })

  it('accepts wantsChurchVisit true', () => {
    const patient = new Patient({ ...baseProps, wantsChurchVisit: true })
    expect(patient.wantsChurchVisit).toBe(true)
  })
})
