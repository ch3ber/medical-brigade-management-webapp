import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { MoveTurnoToTailUseCase } from '@/src/turnos/application/use-cases/move-turno-to-tail'
import type { MoveResult } from '@/src/turnos/domain/repositories/ITurnoRepository'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  BRIGADA_NO_ACTIVA: 409,
  TURNO_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  TURNO_NO_ENCONTRADO: 'El turno solicitado no existe.',
}

function serializeMoveResult(result: MoveResult) {
  return {
    movido: {
      id: result.movido.id,
      label: result.movido.label,
      vecesMovido: result.movido.vecesMovido,
      nuevoOrden: result.movido.nuevoOrden,
    },
    llamado: result.llamado
      ? {
          id: result.llamado.id,
          label: result.llamado.label,
          paciente: { nombre: result.llamado.patient.nombre, edad: result.llamado.patient.edad },
          llamadoEn: result.llamado.llamadoEn,
        }
      : null,
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string; turnoId: string }> },
) {
  const { brigadeId, areaId, turnoId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const result = await new MoveTurnoToTailUseCase(repo).execute({
      brigadeId,
      areaId,
      turnoId,
      userId: user.id,
    })
    return ok(serializeMoveResult(result))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
