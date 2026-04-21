import type { ITurnoRepository, MoveResult } from '../../domain/repositories/ITurnoRepository'

interface MoveTurnoToTailDto {
  brigadeId: string
  areaId: string
  turnoId: string
  userId: string
}

export class MoveTurnoToTailUseCase {
  constructor(private readonly repo: ITurnoRepository) {}

  async execute({ brigadeId, areaId, turnoId, userId }: MoveTurnoToTailDto): Promise<MoveResult> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (!role) throw new Error('SIN_PERMISO')

    const brigade = await this.repo.findBrigadeStatus(brigadeId, userId)
    if (!brigade || brigade.status !== 'ACTIVE') throw new Error('BRIGADA_NO_ACTIVA')

    const turno = await this.repo.findCalledTurno(turnoId, areaId)
    if (!turno) throw new Error('TURNO_NO_ENCONTRADO')

    return this.repo.moveToTail(brigadeId, areaId, turnoId)
  }
}
