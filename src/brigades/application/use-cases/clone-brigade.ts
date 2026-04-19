import type { Brigade } from '../../domain/entities/Brigade'
import type { IBrigadeRepository } from '../../domain/repositories/IBrigadeRepository'

interface CloneBrigadeDto {
  brigadeId: string
  userId: string
  creatorEmail: string
  name: string
  date: string
}

export class CloneBrigadeUseCase {
  constructor(private readonly repo: IBrigadeRepository) {}

  async execute({ brigadeId, userId, creatorEmail, name, date }: CloneBrigadeDto): Promise<Brigade> {
    const source = await this.repo.findById(brigadeId, userId)
    if (!source) throw new Error('BRIGADA_NO_ENCONTRADA')

    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    return this.repo.create({
      name,
      description: source.description,
      location: source.location,
      date: new Date(date),
      createdBy: userId,
      creatorEmail,
    })
  }
}
