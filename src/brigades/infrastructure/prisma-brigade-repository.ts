import type { PrismaClient } from '@/shared/prisma/generated/client'
import type { BrigadeStatus as PrismaBrigadeStatus } from '@/shared/prisma/generated/enums'
import { Brigade, BrigadeWithCounts } from '../domain/entities/Brigade'
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
  status: PrismaBrigadeStatus
  openedAt: Date | null
  closedAt: Date | null
  createdBy: string
  createdAt: Date
}

function toDomainProps(row: PrismaRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    location: row.location,
    date: row.date,
    status: row.status,
    openedAt: row.openedAt,
    closedAt: row.closedAt,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

function toDomain(row: PrismaRow): Brigade {
  return new Brigade(toDomainProps(row))
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

  async findAllByUserId(userId: string): Promise<BrigadeWithCounts[]> {
    const rows = await this.prisma.brigade.findMany({
      where: {
        members: { some: { profileId: userId } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            patients: true,
            areas: { where: { isActive: true } },
          },
        },
      },
    })

    return rows.map(
      (row) =>
        new BrigadeWithCounts({
          ...toDomainProps(row),
          patientsCount: row._count.patients,
          areasCount: row._count.areas,
        }),
    )
  }

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const [profile, member] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      this.prisma.brigadeMember.findFirst({
        where: { brigadeId, profileId: userId },
        select: { role: true },
      }),
    ])
    if (profile?.role === AppRole.PLATFORM_ADMIN) return 'DIRECTOR'
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
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.date !== undefined && { date: data.date }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.openedAt !== undefined && { openedAt: data.openedAt }),
        ...(data.closedAt !== undefined && { closedAt: data.closedAt }),
      },
    })
    return toDomain(row)
  }
}
