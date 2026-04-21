import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, TurnoStatus } from '@/shared/prisma/generated/enums'
import type { TurnoInfo, PatientWithTurnos } from '../domain/entities/Patient'
import type {
  IPatientRepository,
  BrigadeRole,
  RegisterPatientData,
  RegisterPatientResult,
  AreaLimit,
  ListPatientsFilters,
  PaginatedPatients,
} from '../domain/repositories/IPatientRepository'

export class PrismaPatientRepository implements IPatientRepository {
  constructor(private readonly prisma: PrismaClient) {}

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

  async findBrigadeStatus(brigadeId: string, userId: string): Promise<{ status: string } | null> {
    const brigade = await this.prisma.brigade.findFirst({
      where: { id: brigadeId, members: { some: { profileId: userId } } },
      select: { status: true },
    })
    return brigade ? { status: brigade.status } : null
  }

  async findAreaLimits(areaIds: string[], brigadeId: string): Promise<AreaLimit[]> {
    const [areas, counts] = await Promise.all([
      this.prisma.area.findMany({
        where: { id: { in: areaIds }, brigadeId },
        select: { id: true, name: true, prefix: true, patientLimit: true },
      }),
      this.prisma.turno.groupBy({
        by: ['areaId'],
        where: {
          areaId: { in: areaIds },
          status: { not: TurnoStatus.REMOVED },
        },
        _count: { _all: true },
      }),
    ])

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      prefix: area.prefix,
      patientLimit: area.patientLimit,
      currentCount: counts.find((c) => c.areaId === area.id)?._count._all ?? 0,
    }))
  }

  async registerPatient(data: RegisterPatientData): Promise<RegisterPatientResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`global_order_${data.brigadeId}`}))`

      const globalResult = await tx.$queryRaw<Array<{ max: number | null }>>`
        SELECT MAX(global_order) as max FROM patients WHERE brigade_id = ${data.brigadeId}::uuid
      `
      const globalOrder = (globalResult[0]?.max ?? 0) + 1

      const patient = await tx.patient.create({
        data: {
          brigadeId: data.brigadeId,
          fullName: data.fullName,
          age: data.age,
          gender: data.gender,
          phone: data.phone,
          address: data.address,
          wantsChurchVisit: data.wantsChurchVisit,
          globalOrder,
          registeredBy: data.registeredBy,
        },
      })

      const turnoInfos: TurnoInfo[] = []
      for (const areaId of data.areaIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

        const areaResult = await tx.$queryRaw<Array<{ max: number | null }>>`
          SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
        `
        const areaOrder = (areaResult[0]?.max ?? 0) + 1

        const turno = await tx.turno.create({
          data: {
            brigadeId: data.brigadeId,
            areaId,
            patientId: patient.id,
            areaOrder,
            status: TurnoStatus.WAITING,
          },
        })

        const area = await tx.area.findUniqueOrThrow({
          where: { id: areaId },
          select: { name: true, prefix: true },
        })

        turnoInfos.push({
          id: turno.id,
          areaId: turno.areaId,
          areaName: area.name,
          areaPrefix: area.prefix,
          areaOrder: turno.areaOrder,
          status: turno.status,
          movedCount: turno.movedCount,
        })
      }

      return {
        patient: { id: patient.id, fullName: patient.fullName, globalOrder: patient.globalOrder },
        turnos: turnoInfos,
      }
    })
  }

  async findAllByBrigade(
    brigadeId: string,
    userId: string,
    filters: ListPatientsFilters,
  ): Promise<PaginatedPatients> {
    const where = {
      brigadeId,
      brigade: { members: { some: { profileId: userId } } },
      ...(filters.busqueda && {
        fullName: { contains: filters.busqueda, mode: 'insensitive' as const },
      }),
      ...((filters.areaId || filters.status) && {
        turnos: {
          some: {
            ...(filters.areaId && { areaId: filters.areaId }),
            ...(filters.status && { status: filters.status as TurnoStatus }),
          },
        },
      }),
    }

    const skip = (filters.pagina - 1) * filters.limite

    const [rows, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: {
          turnos: {
            include: { area: { select: { name: true, prefix: true } } },
          },
        },
        orderBy: { globalOrder: 'asc' },
        skip,
        take: filters.limite,
      }),
      this.prisma.patient.count({ where }),
    ])

    return {
      patients: rows.map(toPatientWithTurnos),
      total,
      pagina: filters.pagina,
      limite: filters.limite,
    }
  }

  async findById(patientId: string, brigadeId: string, userId: string): Promise<PatientWithTurnos | null> {
    const row = await this.prisma.patient.findFirst({
      where: {
        id: patientId,
        brigadeId,
        brigade: { members: { some: { profileId: userId } } },
      },
      include: {
        turnos: {
          include: { area: { select: { name: true, prefix: true } } },
        },
      },
    })
    return row ? toPatientWithTurnos(row) : null
  }

  async addToArea(brigadeId: string, patientId: string, areaId: string): Promise<TurnoInfo> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

      const areaResult = await tx.$queryRaw<Array<{ max: number | null }>>`
        SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
      `
      const areaOrder = (areaResult[0]?.max ?? 0) + 1

      const turno = await tx.turno.create({
        data: { brigadeId, areaId, patientId, areaOrder, status: TurnoStatus.WAITING },
      })

      const area = await tx.area.findUniqueOrThrow({
        where: { id: areaId },
        select: { name: true, prefix: true },
      })

      return {
        id: turno.id,
        areaId: turno.areaId,
        areaName: area.name,
        areaPrefix: area.prefix,
        areaOrder: turno.areaOrder,
        status: turno.status,
        movedCount: turno.movedCount,
      }
    })
  }
}

type PrismaTurnoWithArea = {
  id: string
  areaId: string
  areaOrder: number
  status: string
  movedCount: number
  area: { name: string; prefix: string }
}

type PrismaPatientWithTurnos = {
  id: string
  brigadeId: string
  fullName: string
  age: number
  gender: string
  phone: string
  address: string
  wantsChurchVisit: boolean
  globalOrder: number
  registeredBy: string
  createdAt: Date
  turnos: PrismaTurnoWithArea[]
}

function toPatientWithTurnos(row: PrismaPatientWithTurnos): PatientWithTurnos {
  return {
    id: row.id,
    brigadeId: row.brigadeId,
    fullName: row.fullName,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    wantsChurchVisit: row.wantsChurchVisit,
    globalOrder: row.globalOrder,
    registeredBy: row.registeredBy,
    createdAt: row.createdAt,
    turnos: row.turnos.map((t) => ({
      id: t.id,
      areaId: t.areaId,
      areaName: t.area.name,
      areaPrefix: t.area.prefix,
      areaOrder: t.areaOrder,
      status: t.status,
      movedCount: t.movedCount,
    })),
  }
}
