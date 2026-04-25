import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, BrigadeRole as PrismaBrigadeRole } from '@/shared/prisma/generated/enums'
import { BrigadeMember } from '../domain/entities/BrigadeMember'
import type { BrigadeMemberProps, BrigadeRole } from '../domain/entities/BrigadeMember'
import type {
  IMemberRepository,
  CreateInviteMemberData,
  CreateCredentialsMemberData,
  UpdateMemberData,
} from '../domain/repositories/IMemberRepository'

type PrismaMemberRow = {
  id: string
  brigadeId: string
  profileId: string | null
  email: string
  role: PrismaBrigadeRole
  generatedUsername: string | null
  generatedPasswordHash: string | null
  inviteToken: string | null
  invitedAt: Date
  acceptedAt: Date | null
  retainAccessAfterClose: boolean
  createdAt: Date
  updatedAt: Date
}

function toDomainProps(row: PrismaMemberRow): BrigadeMemberProps {
  return {
    id: row.id,
    brigadeId: row.brigadeId,
    profileId: row.profileId,
    email: row.email,
    role: row.role as BrigadeRole,
    generatedUsername: row.generatedUsername,
    generatedPasswordHash: row.generatedPasswordHash,
    inviteToken: row.inviteToken,
    invitedAt: row.invitedAt,
    acceptedAt: row.acceptedAt,
    retainAccessAfterClose: row.retainAccessAfterClose,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDomain(row: PrismaMemberRow): BrigadeMember {
  return new BrigadeMember(toDomainProps(row))
}

export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllByBrigade(brigadeId: string, userId: string): Promise<BrigadeMember[]> {
    const rows = await this.prisma.brigadeMember.findMany({
      where: {
        brigadeId,
        brigade: { members: { some: { profileId: userId } } },
      },
      orderBy: { invitedAt: 'asc' },
    })
    return rows.map(toDomain)
  }

  async findById(id: string, brigadeId: string): Promise<BrigadeMember | null> {
    const row = await this.prisma.brigadeMember.findFirst({ where: { id, brigadeId } })
    return row ? toDomain(row) : null
  }

  async findByInviteToken(token: string): Promise<BrigadeMember | null> {
    const row = await this.prisma.brigadeMember.findUnique({ where: { inviteToken: token } })
    return row ? toDomain(row) : null
  }

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const [profile, member] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.brigadeMember.findFirst({
        where: { brigadeId, profileId: userId },
        select: { role: true },
      }),
    ])
    if (profile?.role === AppRole.PLATFORM_ADMIN) return 'DIRECTOR'
    return (member?.role as BrigadeRole) ?? null
  }

  async existsByEmail(brigadeId: string, email: string): Promise<boolean> {
    const count = await this.prisma.brigadeMember.count({ where: { brigadeId, email } })
    return count > 0
  }

  async createInvite(data: CreateInviteMemberData): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.create({
      data: {
        brigadeId: data.brigadeId,
        email: data.email,
        role: data.role as PrismaBrigadeRole,
        inviteToken: data.inviteToken,
      },
    })
    return toDomain(row)
  }

  async createWithCredentials(data: CreateCredentialsMemberData): Promise<BrigadeMember> {
    const generatedPasswordHash = await bcrypt.hash(data.plainPassword, 12)
    const row = await this.prisma.brigadeMember.create({
      data: {
        brigadeId: data.brigadeId,
        email: data.email,
        role: PrismaBrigadeRole.STAFF,
        generatedUsername: data.generatedUsername,
        generatedPasswordHash,
      },
    })
    return toDomain(row)
  }

  async update(id: string, data: UpdateMemberData): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role as PrismaBrigadeRole }),
        ...(data.retainAccessAfterClose !== undefined && {
          retainAccessAfterClose: data.retainAccessAfterClose,
        }),
      },
    })
    return toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brigadeMember.delete({ where: { id } })
  }

  async acceptInvite(token: string, profileId: string): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.update({
      where: { inviteToken: token },
      data: { profileId, acceptedAt: new Date() },
    })
    return toDomain(row)
  }
}
