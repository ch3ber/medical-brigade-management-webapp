import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface ListMembersDto {
  brigadeId: string
  userId: string
}

export class ListMembersUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, userId }: ListMembersDto): Promise<BrigadeMember[]> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')
    return this.repo.findAllByBrigade(brigadeId, userId)
  }
}
