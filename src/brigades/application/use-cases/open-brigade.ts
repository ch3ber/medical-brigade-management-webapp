import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface OpenBrigadeDto {
  brigadeId: string
  userId: string
}

export class OpenBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: OpenBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    if (!brigade.canOpen()) throw new Error('BRIGADA_CERRADA')

    return this.repo.update(brigadeId, { status: 'ACTIVE', openedAt: new Date() })
  }
}
