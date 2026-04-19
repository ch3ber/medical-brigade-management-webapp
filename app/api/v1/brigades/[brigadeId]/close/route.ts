import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { CloseBrigadeUseCase } from '@/src/brigades/application/use-cases/close-brigade'

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  BRIGADA_NO_ENCONTRADA: 404,
  SIN_PERMISO: 403,
  BRIGADA_CERRADA: 409,
  BRIGADA_NO_ACTIVA: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  BRIGADA_NO_ENCONTRADA: 'La brigada solicitada no existe o no tienes acceso a ella.',
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  BRIGADA_CERRADA: 'Esta brigada está cerrada. No se permiten modificaciones.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new CloseBrigadeUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok({
      id: brigade.id,
      status: brigade.status,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
