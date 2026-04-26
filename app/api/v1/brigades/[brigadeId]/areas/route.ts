import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { CreateAreaUseCase } from '@/src/areas/application/use-cases/create-area'
import type { Area } from '@/src/areas/domain/entities/Area'

const postSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido.'),
  prefijo: z
    .string()
    .min(1, 'El prefijo es requerido.')
    .max(4, 'El prefijo no puede tener más de 4 caracteres.'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Debe ser un color hexadecimal válido (#RRGGBB).'),
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
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
}

function mapArea(area: Area) {
  return {
    id: area.id,
    nombre: area.name,
    prefijo: area.prefix,
    color: area.color,
    limitePacientes: area.patientLimit,
    orden: area.order,
    activa: area.isActive,
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaAreaRepository(prisma)
    const areas = await new ListAreasUseCase(repo).execute({ brigadeId, userId: user.id })

    return ok(
      areas.map((area) => ({
        ...mapArea(area),
        totalEnEspera: area.totalEnEspera,
        totalAtendidos: area.totalAtendidos,
      })),
    )
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
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

  const { nombre, prefijo, color, limitePacientes, orden } = parsed.data

  try {
    const repo = new PrismaAreaRepository(prisma)
    const area = await new CreateAreaUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      name: nombre,
      prefix: prefijo,
      color,
      patientLimit: limitePacientes ?? null,
      order: orden,
    })

    return ok(mapArea(area), 201)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
