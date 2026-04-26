import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface InviteMemberDto {
  brigadeId: string
  userId: string
  email: string
  role: 'STAFF' | 'CO_DIRECTOR'
}

export class InviteMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, userId, email, role }: InviteMemberDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const exists = await this.repo.existsByEmail(brigadeId, email)
    if (exists) throw new Error('MIEMBRO_YA_EXISTE')

    return this.repo.createInvite({ brigadeId, email, role, inviteToken: crypto.randomUUID() })
  }
}
