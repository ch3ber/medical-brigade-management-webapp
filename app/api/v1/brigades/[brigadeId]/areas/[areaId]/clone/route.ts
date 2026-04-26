import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { CloneAreaUseCase } from '@/src/areas/application/use-cases/clone-area'

const postSchema = z.object({
  brigadaDestinoId: z.string().uuid('Debe ser un UUID válido.'),
})

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number, fields?: { field: string; message: string }[]) {
  return Response.json(
    { success: false, data: null, errors: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  AREA_NO_ENCONTRADA: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string }> },
) {
  const { brigadeId, areaId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  try {
    const repo = new PrismaAreaRepository(prisma)
    const area = await new CloneAreaUseCase(repo).execute({
      brigadeId,
      areaId,
      userId: user.id,
      targetBrigadeId: parsed.data.brigadaDestinoId,
    })

    return ok(
      {
        id: area.id,
        nombre: area.name,
        prefijo: area.prefix,
        color: area.color,
        limitePacientes: area.patientLimit,
        orden: area.order,
        activa: area.isActive,
      },
      201,
    )
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
