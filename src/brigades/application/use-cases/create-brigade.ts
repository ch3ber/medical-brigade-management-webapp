import type { IBrigadeRepository, CreateBrigadeData } from '../../domain/repositories/IBrigadeRepository'
import type { Brigade } from '../../domain/entities/Brigade'

export class CreateBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute(data: CreateBrigadeData): Promise<Brigade> {
    return this.repo.create(data)
  }
}
