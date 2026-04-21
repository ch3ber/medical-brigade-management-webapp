import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { UpdateAreaUseCase } from '@/src/areas/application/use-cases/update-area'
import { DeleteAreaUseCase } from '@/src/areas/application/use-cases/delete-area'

const patchSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.').optional(),
  prefijo: z.string().min(1).max(4, 'El prefijo no puede tener más de 4 caracteres.').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (#RRGGBB).')
    .optional(),
  limitePacientes: z.number().int().positive().nullable().optional(),
  orden: z.number().int().positive().optional(),
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
  AREA_CON_TURNOS_ACTIVOS: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
  AREA_CON_TURNOS_ACTIVOS:
    'El área tiene turnos activos. Atiende o elimina los turnos antes de eliminar el área.',
}

export async function PATCH(
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
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => ({
      field: String(issue.path[0] ?? 'unknown'),
      message: issue.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  const { nombre, prefijo, color, limitePacientes, orden } = parsed.data

  try {
    const repo = new PrismaAreaRepository(prisma)
    const area = await new UpdateAreaUseCase(repo).execute({
      brigadeId,
      areaId,
      userId: user.id,
      data: {
        ...(nombre !== undefined && { name: nombre }),
        ...(prefijo !== undefined && { prefix: prefijo }),
        ...(color !== undefined && { color }),
        ...(limitePacientes !== undefined && { patientLimit: limitePacientes }),
        ...(orden !== undefined && { order: orden }),
      },
    })

    return ok({
      id: area.id,
      nombre: area.name,
      prefijo: area.prefix,
      color: area.color,
      limitePacientes: area.patientLimit,
      orden: area.order,
      activa: area.isActive,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; areaId: string }> },
) {
  const { brigadeId, areaId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaAreaRepository(prisma)
    await new DeleteAreaUseCase(repo).execute({ brigadeId, areaId, userId: user.id })

    return ok(null)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
