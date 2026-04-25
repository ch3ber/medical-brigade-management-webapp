export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface BrigadeMemberProps {
  id: string
  brigadeId: string
  profileId: string | null
  email: string
  role: BrigadeRole
  generatedUsername: string | null
  generatedPasswordHash: string | null
  inviteToken: string | null
  invitedAt: Date
  acceptedAt: Date | null
  retainAccessAfterClose: boolean
  createdAt: Date
  updatedAt: Date
}

export class BrigadeMember {
  readonly id: string
  readonly brigadeId: string
  readonly profileId: string | null
  readonly email: string
  readonly role: BrigadeRole
  readonly generatedUsername: string | null
  readonly generatedPasswordHash: string | null
  readonly inviteToken: string | null
  readonly invitedAt: Date
  readonly acceptedAt: Date | null
  readonly retainAccessAfterClose: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: BrigadeMemberProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.profileId = props.profileId
    this.email = props.email
    this.role = props.role
    this.generatedUsername = props.generatedUsername
    this.generatedPasswordHash = props.generatedPasswordHash
    this.inviteToken = props.inviteToken
    this.invitedAt = props.invitedAt
    this.acceptedAt = props.acceptedAt
    this.retainAccessAfterClose = props.retainAccessAfterClose
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  isPending(): boolean {
    return this.acceptedAt === null
  }

  hasGeneratedCredentials(): boolean {
    return this.generatedUsername !== null
  }
}
