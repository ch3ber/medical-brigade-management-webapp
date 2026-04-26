import type { BrigadeMember, BrigadeRole } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface UpdateMemberRoleDto {
  brigadeId: string
  memberId: string
  userId: string
  role?: BrigadeRole
  retainAccessAfterClose?: boolean
}

export class UpdateMemberRoleUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({
    brigadeId,
    memberId,
    userId,
    role,
    retainAccessAfterClose,
  }: UpdateMemberRoleDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const member = await this.repo.findById(memberId, brigadeId)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')

    return this.repo.update(memberId, { role, retainAccessAfterClose })
  }
}
