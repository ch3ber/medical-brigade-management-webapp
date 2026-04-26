import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface AcceptInviteDto {
  token: string
  profileId: string
}

export class AcceptInviteUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ token, profileId }: AcceptInviteDto): Promise<BrigadeMember> {
    const member = await this.repo.findByInviteToken(token)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')
    if (!member.isPending()) throw new Error('INVITACION_YA_ACEPTADA')
    return this.repo.acceptInvite(token, profileId)
  }
}
