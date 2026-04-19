import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface CloseBrigadeDto {
  brigadeId: string
  userId: string
}

export class CloseBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: CloseBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    if (brigade.status === 'DRAFT') throw new Error('BRIGADA_NO_ACTIVA')
    if (!brigade.canClose()) throw new Error('BRIGADA_CERRADA')

    return this.repo.update(brigadeId, { status: 'CLOSED', closedAt: new Date() })
  }
}
