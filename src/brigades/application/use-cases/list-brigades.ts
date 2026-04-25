import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'
import type { BrigadeWithCounts } from '../../domain/entities/Brigade'

interface ListBrigadesDto {
  userId: string
}

export class ListBrigadesUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ userId }: ListBrigadesDto): Promise<BrigadeWithCounts[]> {
    return this.repo.findAllByUserId(userId)
  }
}
