import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface RemoveMemberDto {
  brigadeId: string
  memberId: string
  userId: string
}

export class RemoveMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, memberId, userId }: RemoveMemberDto): Promise<void> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const member = await this.repo.findById(memberId, brigadeId)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')

    if (member.profileId === userId) throw new Error('NO_PUEDE_ELIMINARSE_A_SI_MISMO')

    await this.repo.delete(memberId)
  }
}
