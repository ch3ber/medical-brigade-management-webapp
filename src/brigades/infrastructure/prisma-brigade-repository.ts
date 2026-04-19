import type { PrismaClient } from '@/shared/prisma/generated/client'
import { Brigade } from '../domain/entities/Brigade'
import type {
  IBrigadeRepository,
  BrigadeRole,
  CreateBrigadeData,
  UpdateBrigadeData,
} from '../domain/repositories/IBrigadeRepository'
import { AppRole } from '@/shared/prisma/generated/enums'

type PrismaRow = {
  id: string
  name: string
  description: string | null
  location: string
  date: Date
  status: string
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

function toDomain(row: PrismaRow): Brigade {
  return new Brigade({
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    date: row.date,
    status: row.status as Brigade['status'],
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  })
}

export class PrismaBrigadeRepository implements IBrigadeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<Brigade | null> {
    const row = await this.prisma.brigade.findFirst({
      where: {
        id,
        members: { some: { profileId: userId } },
      },
    })
    return row ? toDomain(row) : null
  }

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    if (profile?.role === AppRole.PLATFORM_ADMIN) return 'DIRECTOR'

    const member = await this.prisma.brigadeMember.findFirst({
      where: { brigadeId, profileId: userId },
      select: { role: true },
    })
    return (member?.role as BrigadeRole) ?? null
  }

  async create(data: CreateBrigadeData): Promise<Brigade> {
    const row = await this.prisma.brigade.create({
      data: {
        name: data.name,
        description: data.description,
        location: data.location,
        date: data.date,
        createdBy: data.createdBy,
        members: {
          create: {
            email: data.creatorEmail,
            role: 'DIRECTOR',
            profileId: data.createdBy,
          },
        },
      },
    })
    return toDomain(row)
  }

  async update(id: string, data: UpdateBrigadeData): Promise<Brigade> {
    const row = await this.prisma.brigade.update({
      where: { id },
      data,
    })
    return toDomain(row)
  }
}
