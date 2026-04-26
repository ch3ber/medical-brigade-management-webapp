import type { IPatientRepository } from '../../domain/repositories/IPatientRepository'
import type { PatientWithTurnos } from '../../domain/entities/Patient'

interface GetPatientDetailDto {
  brigadeId: string
  patientId: string
  userId: string
}

export class GetPatientDetailUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, patientId, userId }: GetPatientDetailDto): Promise<PatientWithTurnos> {
    const patient = await this.repo.findById(patientId, brigadeId, userId)
    if (!patient) throw new Error('PACIENTE_NO_ENCONTRADO')
    return patient
  }
}
