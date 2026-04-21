import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { AddPatientToAreaUseCase } from '@/src/patients/application/use-cases/add-patient-to-area'

const postSchema = z.object({
  areaId: z.string().uuid('Debe ser un UUID válido.'),
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
  BRIGADA_NO_ACTIVA: 409,
  LIMITE_AREA_ALCANZADO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  AREA_NO_ENCONTRADA: 'El área solicitada no existe.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  LIMITE_AREA_ALCANZADO: 'El área ha alcanzado su límite de pacientes.',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; patientId: string }> },
) {
  const { brigadeId, patientId } = await params
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
    const repo = new PrismaPatientRepository(prisma)
    const turno = await new AddPatientToAreaUseCase(repo).execute({
      brigadeId,
      patientId,
      areaId: parsed.data.areaId,
      userId: user.id,
    })

    return ok(
      {
        id: turno.id,
        areaId: turno.areaId,
        areaNombre: turno.areaName,
        label: `${turno.areaPrefix}-${turno.areaOrder}`,
        ordenArea: turno.areaOrder,
        status: turno.status,
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
