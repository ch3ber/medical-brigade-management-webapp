import type { ITurnoRepository, NextTurnoResult } from '../../domain/repositories/ITurnoRepository'

interface CallNextTurnoDto {
  brigadeId: string
  areaId: string
  userId: string
}

export class CallNextTurnoUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, userId }: CallNextTurnoDto): Promise<NextTurnoResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    return this.repo.callNext(brigadeId, areaId)
  }
}
