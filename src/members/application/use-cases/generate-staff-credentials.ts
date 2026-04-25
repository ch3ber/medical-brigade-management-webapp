import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface GenerateStaffCredentialsDto {
  brigadeId: string
  userId: string
  email: string
  generatedUsername: string
  plainPassword: string
}

export class GenerateStaffCredentialsUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({
    brigadeId,
    userId,
    email,
    generatedUsername,
    plainPassword,
  }: GenerateStaffCredentialsDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const exists = await this.repo.existsByEmail(brigadeId, email)
    if (exists) throw new Error('MIEMBRO_YA_EXISTE')

    return this.repo.createWithCredentials({
      brigadeId,
      email,
      generatedUsername,
      plainPassword,
      role: 'STAFF',
    })
  }
}
