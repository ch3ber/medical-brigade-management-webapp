import type { NextRequest } from 'next/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { GetPublicAreaQueueUseCase } from '@/src/turnos/application/use-cases/get-public-area-queue'

function ok<T>(data: T) {
  return Response.json({ success: true, data, errors: null }, { status: 200 })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  AREA_NO_ENCONTRADA: 404,
  TOKEN_REQUERIDO: 400,
}

const ERROR_MESSAGES: Record<string, string> = {
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
  TOKEN_REQUERIDO: 'El token de acceso es requerido.',
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string }> },
) {
  const { brigadeId, areaId } = await params
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return err('TOKEN_REQUERIDO', ERROR_MESSAGES.TOKEN_REQUERIDO, 400)

  try {
    const repo = new PrismaTurnoRepository(prisma)
    const queue = await new GetPublicAreaQueueUseCase(repo).execute({ brigadeId, areaId, token })
    return ok({
      area: { nombre: queue.area.nombre, prefijo: queue.area.prefijo, color: queue.area.color },
      turnoActual: queue.turnoActual,
      enEspera: queue.enEspera,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
