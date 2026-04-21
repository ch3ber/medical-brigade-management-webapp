import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, TurnoStatus } from '@/shared/prisma/generated/enums'
import { Area, AreaWithCounts } from '../domain/entities/Area'
import type { AreaProps } from '../domain/entities/Area'
import type {
  IAreaRepository,
  BrigadeRole,
  CreateAreaData,
  UpdateAreaData,
} from '../domain/repositories/IAreaRepository'

type PrismaAreaRow = {
  id: string
  brigadeId: string
  name: string
  prefix: string
  color: string
  patientLimit: number | null
  order: number
  isActive: boolean
  publicDashboardToken: string | null
  createdAt: Date
  updatedAt: Date
}

function toDomainProps(row: PrismaAreaRow): AreaProps {
  return {
    id: row.id,
    brigadeId: row.brigadeId,
    name: row.name,
    prefix: row.prefix,
    color: row.color,
    patientLimit: row.patientLimit,
    order: row.order,
    isActive: row.isActive,
    publicDashboardToken: row.publicDashboardToken,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDomain(row: PrismaAreaRow): Area {
  return new Area(toDomainProps(row))
}

export class PrismaAreaRepository implements IAreaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllByBrigade(brigadeId: string, userId: string): Promise<AreaWithCounts[]> {
    const areas = await this.prisma.area.findMany({
      where: {
        brigadeId,
        isActive: true,
        brigade: { members: { some: { profileId: userId } } },
      },
      orderBy: { order: 'asc' },
    })

    if (areas.length === 0) return []

    const counts = await this.prisma.turno.groupBy({
      by: ['areaId', 'status'],
      where: {
        areaId: { in: areas.map((a) => a.id) },
        status: { in: [TurnoStatus.WAITING, TurnoStatus.SERVED] },
      },
      _count: { _all: true },
    })

    return areas.map((row) => {
      const areaCount = counts.filter((c) => c.areaId === row.id)
      const totalEnEspera = areaCount.find((c) => c.status === TurnoStatus.WAITING)?._count._all ?? 0
      const totalAtendidos = areaCount.find((c) => c.status === TurnoStatus.SERVED)?._count._all ?? 0
      return new AreaWithCounts({ ...toDomainProps(row), totalEnEspera, totalAtendidos })
    })
  }

  async findById(id: string, brigadeId: string): Promise<Area | null> {
    const row = await this.prisma.area.findFirst({
      where: { id, brigadeId },
    })
    return row ? toDomain(row) : null
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

  async getMaxOrder(brigadeId: string): Promise<number> {
    const result = await this.prisma.area.aggregate({
      where: { brigadeId, isActive: true },
      _max: { order: true },
    })
    return result._max.order ?? 0
  }

  async create(data: CreateAreaData): Promise<Area> {
    const row = await this.prisma.area.create({
      data: {
        brigadeId: data.brigadeId,
        name: data.name,
        prefix: data.prefix,
        color: data.color,
        patientLimit: data.patientLimit,
        order: data.order,
      },
    })
    return toDomain(row)
  }

  async update(id: string, data: UpdateAreaData): Promise<Area> {
    const row = await this.prisma.area.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.prefix !== undefined && { prefix: data.prefix }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.patientLimit !== undefined && { patientLimit: data.patientLimit }),
        ...(data.order !== undefined && { order: data.order }),
      },
    })
    return toDomain(row)
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.area.update({
      where: { id },
      data: { isActive: false },
    })
  }

  async hasActiveTurnos(id: string): Promise<boolean> {
    const count = await this.prisma.turno.count({
      where: {
        areaId: id,
        status: { in: [TurnoStatus.WAITING, TurnoStatus.CALLED] },
      },
    })
    return count > 0
  }
}
