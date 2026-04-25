// src/turnos/infrastructure/prisma-turno-repository.ts
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, TurnoStatus } from '@/shared/prisma/generated/enums'
import type {
  ITurnoRepository,
  BrigadeRole,
  ServedTurnoInfo,
  CalledTurnoInfo,
  NextTurnoResult,
  MoveResult,
  RemoveResult,
  PublicAreaQueue,
  AuthenticatedAreaQueue,
} from '../domain/repositories/ITurnoRepository'

export class PrismaTurnoRepository implements ITurnoRepository {
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

  async findWaitingTurno(turnoId: string, areaId: string): Promise<{ id: string } | null> {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, areaId, status: TurnoStatus.WAITING },
      select: { id: true },
    })
    return turno ? { id: turno.id } : null
  }

  async findCalledTurno(turnoId: string, areaId: string): Promise<{ id: string } | null> {
    const turno = await this.prisma.turno.findFirst({
      where: { id: turnoId, areaId, status: TurnoStatus.CALLED },
      select: { id: true },
    })
    return turno ? { id: turno.id } : null
  }

  async callNext(brigadeId: string, areaId: string): Promise<NextTurnoResult> {
    return this.prisma.$transaction(async (tx) => {
      const called = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        include: { area: { select: { prefix: true } } },
      })
      let atendido: ServedTurnoInfo | null = null
      if (called) {
        const servedAt = new Date()
        await tx.turno.update({ where: { id: called.id }, data: { status: TurnoStatus.SERVED, servedAt } })
        atendido = { id: called.id, label: `${called.area.prefix}-${called.areaOrder}`, atendidoEn: servedAt }
      }

      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

      return { atendido, llamado, enEspera }
    })
  }

  async callSpecific(brigadeId: string, areaId: string, turnoId: string): Promise<NextTurnoResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        include: { area: { select: { prefix: true } } },
      })
      let atendido: ServedTurnoInfo | null = null
      if (existing) {
        const servedAt = new Date()
        await tx.turno.update({ where: { id: existing.id }, data: { status: TurnoStatus.SERVED, servedAt } })
        atendido = {
          id: existing.id,
          label: `${existing.area.prefix}-${existing.areaOrder}`,
          atendidoEn: servedAt,
        }
      }

      const llamadoEn = new Date()
      const updated = await tx.turno.update({
        where: { id: turnoId, status: TurnoStatus.WAITING },
        data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      const llamado: CalledTurnoInfo = {
        id: updated.id,
        label: `${updated.area.prefix}-${updated.areaOrder}`,
        patient: { nombre: updated.patient.fullName, edad: updated.patient.age },
        llamadoEn,
      }

      const enEspera = await tx.turno.count({ where: { areaId, status: TurnoStatus.WAITING } })

      return { atendido, llamado, enEspera }
    })
  }

  async moveToTail(brigadeId: string, areaId: string, turnoId: string): Promise<MoveResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`area_order_${areaId}`}))`

      const [{ max }] = await tx.$queryRaw<[{ max: number | null }]>`
        SELECT MAX(area_order) as max FROM turnos WHERE area_id = ${areaId}::uuid
      `
      const nuevoOrden = (max ?? 0) + 1

      const moved = await tx.turno.update({
        where: { id: turnoId },
        data: { status: TurnoStatus.WAITING, areaOrder: nuevoOrden, movedCount: { increment: 1 } },
        include: { area: { select: { prefix: true } } },
      })

      // The moved turno was CALLED, so the CALLED slot is now vacant — auto-promote next in queue.
      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING, id: { not: turnoId } },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      return {
        movido: {
          id: moved.id,
          label: `${moved.area.prefix}-${nuevoOrden}`,
          vecesMovido: moved.movedCount,
          nuevoOrden,
        },
        llamado,
      }
    })
  }

  async remove(brigadeId: string, areaId: string, turnoId: string): Promise<RemoveResult> {
    return this.prisma.$transaction(async (tx) => {
      const removed = await tx.turno.update({
        where: { id: turnoId, status: TurnoStatus.CALLED },
        data: { status: TurnoStatus.REMOVED },
        include: { area: { select: { prefix: true } } },
      })

      const next = await tx.turno.findFirst({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        include: { area: { select: { prefix: true } }, patient: { select: { fullName: true, age: true } } },
      })
      let llamado: CalledTurnoInfo | null = null
      if (next) {
        const llamadoEn = new Date()
        await tx.turno.update({
          where: { id: next.id },
          data: { status: TurnoStatus.CALLED, calledAt: llamadoEn },
        })
        llamado = {
          id: next.id,
          label: `${next.area.prefix}-${next.areaOrder}`,
          patient: { nombre: next.patient.fullName, edad: next.patient.age },
          llamadoEn,
        }
      }

      return {
        eliminado: { id: removed.id, label: `${removed.area.prefix}-${removed.areaOrder}` },
        llamado,
      }
    })
  }

  async getPublicAreaQueue(
    brigadeId: string,
    areaId: string,
    token: string,
  ): Promise<PublicAreaQueue | null> {
    const area = await this.prisma.area.findFirst({
      where: { id: areaId, brigadeId, publicDashboardToken: token },
      select: { name: true, prefix: true, color: true },
    })
    if (!area) return null

    const [called, waiting] = await Promise.all([
      this.prisma.turno.findFirst({
        where: { areaId, status: TurnoStatus.CALLED },
        select: { areaOrder: true },
      }),
      this.prisma.turno.findMany({
        where: { areaId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        select: { areaOrder: true },
      }),
    ])

    return {
      area: { nombre: area.name, prefijo: area.prefix, color: area.color },
      turnoActual: called ? { label: `${area.prefix}-${called.areaOrder}` } : null,
      enEspera: waiting.map((t) => ({ label: `${area.prefix}-${t.areaOrder}` })),
    }
  }

  async getAuthenticatedAreaQueue(
    brigadeId: string,
    areaId: string,
    userId: string,
  ): Promise<AuthenticatedAreaQueue | null> {
    const role = await this.getMemberRole(brigadeId, userId)
    if (!role) return null

    const area = await this.prisma.area.findFirst({
      where: { id: areaId, brigadeId },
      select: { id: true, name: true, prefix: true, color: true },
    })
    if (!area) return null

    const [called, waiting, served] = await Promise.all([
      this.prisma.turno.findFirst({
        where: { areaId, brigadeId, status: TurnoStatus.CALLED },
        include: { patient: { select: { fullName: true, age: true } } },
      }),
      this.prisma.turno.findMany({
        where: { areaId, brigadeId, status: TurnoStatus.WAITING },
        orderBy: { areaOrder: 'asc' },
        include: { patient: { select: { fullName: true, age: true } } },
      }),
      this.prisma.turno.findMany({
        where: { areaId, brigadeId, status: TurnoStatus.SERVED },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { patient: { select: { fullName: true } } },
      }),
    ])

    return {
      area: { id: area.id, nombre: area.name, prefijo: area.prefix, color: area.color },
      turnoActual: called
        ? {
            id: called.id,
            label: `${area.prefix}-${called.areaOrder}`,
            patientName: called.patient.fullName,
            age: called.patient.age,
          }
        : null,
      enEspera: waiting.map((t) => ({
        id: t.id,
        label: `${area.prefix}-${t.areaOrder}`,
        patientName: t.patient.fullName,
        age: t.patient.age,
      })),
      atendidos: served.map((t) => ({
        id: t.id,
        label: `${area.prefix}-${t.areaOrder}`,
        patientName: t.patient.fullName,
      })),
    }
  }
}
