import type { IPatientRepository, RegisterPatientResult } from '../../domain/repositories/IPatientRepository'

interface RegisterPatientDto {
  brigadeId: string
  userId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  areaIds: string[]
}

export class RegisterPatientUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({
    brigadeId,
    userId,
    fullName,
    age,
    gender,
    phone,
    address,
    wantsChurchVisit,
    areaIds,
  }: RegisterPatientDto): Promise<RegisterPatientResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const areaLimits = await this.repo.findAreaLimits(areaIds, brigadeId)
    for (const area of areaLimits) {
      if (area.patientLimit !== null && area.currentCount >= area.patientLimit) {
        throw new Error('LIMITE_AREA_ALCANZADO')
      }
    }

    return this.repo.registerPatient({
      brigadeId,
      fullName,
      age,
      gender,
      phone,
      address,
      wantsChurchVisit,
      areaIds,
      registeredBy: userId,
    })
  }
}
