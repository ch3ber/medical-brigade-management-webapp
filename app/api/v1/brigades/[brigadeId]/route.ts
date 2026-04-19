import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'

const patchSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().nullable().optional(),
  ubicacion: z.string().min(1).optional(),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Debe ser una fecha en formato YYYY-MM-DD')
    .optional(),
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new GetBrigadeUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok({
      id: brigade.id,
      nombre: brigade.name,
      descripcion: brigade.description,
      ubicacion: brigade.location,
      fecha: brigade.date.toISOString().split('T')[0],
      status: brigade.status,
      abiertaEn: brigade.openedAt?.toISOString() ?? null,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
      creadoPor: brigade.createdBy,
      creadoEn: brigade.createdAt.toISOString(),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
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

  const { nombre, descripcion, ubicacion, fecha } = parsed.data

  try {
    const repo = new PrismaBrigadeRepository(prisma)
    const brigade = await new UpdateBrigadeUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      data: {
        ...(nombre !== undefined && { name: nombre }),
        ...(descripcion !== undefined && { description: descripcion }),
        ...(ubicacion !== undefined && { location: ubicacion }),
        ...(fecha !== undefined && { date: new Date(fecha) }),
      },
    })

    return ok({
      id: brigade.id,
      nombre: brigade.name,
      descripcion: brigade.description,
      ubicacion: brigade.location,
      fecha: brigade.date.toISOString().split('T')[0],
      status: brigade.status,
      abiertaEn: brigade.openedAt?.toISOString() ?? null,
      cerradaEn: brigade.closedAt?.toISOString() ?? null,
      creadoPor: brigade.createdBy,
      creadoEn: brigade.createdAt.toISOString(),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
