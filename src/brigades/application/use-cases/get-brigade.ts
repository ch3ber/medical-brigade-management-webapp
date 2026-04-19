import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface GetBrigadeDto {
  brigadeId: string
  userId: string
}

export class GetBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId }: GetBrigadeDto): Promise<Brigade> {
    const brigade = await this.repo.findById(brigadeId, userId)
    if (!brigade) throw new Error('BRIGADA_NO_ENCONTRADA')
    return brigade
  }
}
