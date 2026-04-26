import type { BrigadeMember, BrigadeRole } from '../entities/BrigadeMember'

export type { BrigadeRole }

export interface CreateInviteMemberData {
  brigadeId: string
  email: string
  role: BrigadeRole
  inviteToken: string
}

export interface CreateCredentialsMemberData {
  brigadeId: string
  email: string
  generatedUsername: string
  plainPassword: string
  role: 'STAFF'
  profileId?: string
}

export interface UpdateMemberData {
  role?: BrigadeRole
  retainAccessAfterClose?: boolean
}

export interface IMemberRepository {
  findAllByBrigade(brigadeId: string, userId: string): Promise<BrigadeMember[]>
  findById(id: string, brigadeId: string): Promise<BrigadeMember | null>
  findByInviteToken(token: string): Promise<BrigadeMember | null>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  existsByEmail(brigadeId: string, email: string): Promise<boolean>
  createInvite(data: CreateInviteMemberData): Promise<BrigadeMember>
  createWithCredentials(data: CreateCredentialsMemberData): Promise<BrigadeMember>
  update(id: string, data: UpdateMemberData): Promise<BrigadeMember>
  delete(id: string): Promise<void>
  acceptInvite(token: string, profileId: string): Promise<BrigadeMember>
}
