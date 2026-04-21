import type { ITurnoRepository, NextTurnoResult } from '../../domain/repositories/ITurnoRepository'

interface CallSpecificTurnoDto {
  brigadeId: string
  areaId: string
  turnoId: string
  userId: string
}

export class CallSpecificTurnoUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, turnoId, userId }: CallSpecificTurnoDto): Promise<NextTurnoResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const turno = await this.repo.findWaitingTurno(turnoId, areaId)
    if (!turno) throw new Error('TURNO_NO_ENCONTRADO')

    return this.repo.callSpecific(brigadeId, areaId, turnoId)
  }
}
