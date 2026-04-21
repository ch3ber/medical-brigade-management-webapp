import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'
import type { IPatientRepository } from '@/src/patients/domain/repositories/IPatientRepository'
import type { PatientWithTurnos } from '@/src/patients/domain/entities/Patient'

function makeMockRepo(overrides: Partial<IPatientRepository> = {}): IPatientRepository {
  return {
    getMemberRole: vi.fn().mockResolvedValue(null),
    findBrigadeStatus: vi.fn().mockResolvedValue(null),
    findAreaLimits: vi.fn().mockResolvedValue([]),
    registerPatient: vi.fn().mockResolvedValue(null),
    findAllByBrigade: vi.fn().mockResolvedValue({ patients: [], total: 0, pagina: 1, limite: 50 }),
    findById: vi.fn().mockResolvedValue(null),
    addToArea: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function makePatientWithTurnos(): PatientWithTurnos {
  return {
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
    createdAt: new Date(),
    turnos: [],
  }
}

describe('GetPatientDetailUseCase', () => {
  it('throws PACIENTE_NO_ENCONTRADO when patient not found', async () => {
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(null) })

    await expect(
      new GetPatientDetailUseCase(repo).execute({
        brigadeId: 'brigade-1',
        patientId: 'missing',
        userId: 'user-1',
      }),
    ).rejects.toThrow('PACIENTE_NO_ENCONTRADO')
  })

  it('returns patient with turnos when found', async () => {
    const patient = makePatientWithTurnos()
    const repo = makeMockRepo({ findById: vi.fn().mockResolvedValue(patient) })

    const result = await new GetPatientDetailUseCase(repo).execute({
      brigadeId: 'brigade-1',
      patientId: 'patient-1',
      userId: 'user-1',
    })

    expect(result).toBe(patient)
    expect(repo.findById).toHaveBeenCalledWith('patient-1', 'brigade-1', 'user-1')
  })
})
