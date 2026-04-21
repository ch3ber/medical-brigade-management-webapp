import type { IPatientRepository } from '../../domain/repositories/IPatientRepository'
import type { TurnoInfo } from '../../domain/entities/Patient'

interface AddPatientToAreaDto {
  brigadeId: string
  patientId: string
  areaId: string
  userId: string
}

export class AddPatientToAreaUseCase {
  constructor(private readonly repo: IPatientRepository) {}

  async execute({ brigadeId, patientId, areaId, userId }: AddPatientToAreaDto): Promise<TurnoInfo> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const [area] = await this.repo.findAreaLimits([areaId], brigadeId)
    if (area && area.patientLimit !== null && area.currentCount >= area.patientLimit) {
      throw new Error('LIMITE_AREA_ALCANZADO')
    }

    return this.repo.addToArea(brigadeId, patientId, areaId)
  }
}
