import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository, UpdateBrigadeData } from '../../domain/repositories/IBrigadeRepository'

interface UpdateBrigadeDto {
  brigadeId: string
  userId: string
  data: UpdateBrigadeData
}

export class UpdateBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId, data }: UpdateBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')
    if (!brigade.isEditable()) throw new Error('BRIGADA_CERRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    return this.repo.update(brigadeId, data)
  }
}
