import type { IAreaRepository } from '../../domain/repositories/IAreaRepository'
import type { AreaWithCounts } from '../../domain/entities/Area'

interface ListAreasDto {
  brigadeId: string
  userId: string
}

export class ListAreasUseCase {
  constructor(private readonly repo: IAreaRepository) {}

  async execute({ brigadeId, userId }: ListAreasDto): Promise<AreaWithCounts[]> {
    return this.repo.findAllByBrigade(brigadeId, userId)
  }
}
