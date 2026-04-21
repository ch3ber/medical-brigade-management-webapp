import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { ListPatientsUseCase } from '@/src/patients/application/use-cases/list-patients'
import { RegisterPatientUseCase } from '@/src/patients/application/use-cases/register-patient'
import type { TurnoInfo } from '@/src/patients/domain/entities/Patient'

const postSchema = z.object({
  nombreCompleto: z.string().min(1, 'El nombre completo es requerido.'),
  edad: z.number().int().positive('La edad debe ser un número positivo.'),
  genero: z.enum(['male', 'female', 'other'], { message: 'El género debe ser male, female u other.' }),
  telefono: z.string().min(1, 'El teléfono es requerido.'),
  direccion: z.string().min(1, 'La dirección es requerida.'),
  quiereVisitaIglesia: z.boolean(),
  areaIds: z.array(z.string().uuid()).min(1, 'Se requiere al menos un área.'),
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
  PACIENTE_NO_ENCONTRADO: 404,
  BRIGADA_NO_ACTIVA: 409,
  LIMITE_AREA_ALCANZADO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  PACIENTE_NO_ENCONTRADO: 'El paciente solicitado no existe.',
  BRIGADA_NO_ACTIVA: 'La brigada debe estar activa para realizar esta acción.',
  LIMITE_AREA_ALCANZADO: 'El área ha alcanzado su límite de pacientes.',
}

function mapTurno(t: TurnoInfo, includeOrden = false) {
  return {
    id: t.id,
    areaId: t.areaId,
    areaNombre: t.areaName,
    label: `${t.areaPrefix}-${t.areaOrder}`,
    ...(includeOrden && { ordenArea: t.areaOrder }),
    status: t.status,
    vecesMovido: t.movedCount,
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const { searchParams } = new URL(req.url)
  const filters = {
    areaId: searchParams.get('areaId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    busqueda: searchParams.get('busqueda') ?? undefined,
    pagina: Math.max(1, Number(searchParams.get('pagina') ?? '1')),
    limite: Math.min(100, Math.max(1, Number(searchParams.get('limite') ?? '50'))),
  }

  try {
    const repo = new PrismaPatientRepository(prisma)
    const result = await new ListPatientsUseCase(repo).execute({ brigadeId, userId: user.id, filters })

    return ok({
      pacientes: result.patients.map((p) => ({
        id: p.id,
        nombreCompleto: p.fullName,
        edad: p.age,
        genero: p.gender,
        telefono: p.phone,
        direccion: p.address,
        quiereVisitaIglesia: p.wantsChurchVisit,
        ordenGlobal: p.globalOrder,
        registradoEn: p.createdAt.toISOString(),
        turnos: p.turnos.map((t) => mapTurno(t)),
      })),
      total: result.total,
      pagina: result.pagina,
      limite: result.limite,
    })
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

  const { nombreCompleto, edad, genero, telefono, direccion, quiereVisitaIglesia, areaIds } = parsed.data

  try {
    const repo = new PrismaPatientRepository(prisma)
    const result = await new RegisterPatientUseCase(repo).execute({
      brigadeId,
      userId: user.id,
      fullName: nombreCompleto,
      age: edad,
      gender: genero,
      phone: telefono,
      address: direccion,
      wantsChurchVisit: quiereVisitaIglesia,
      areaIds,
    })

    return ok(
      {
        paciente: {
          id: result.patient.id,
          nombreCompleto: result.patient.fullName,
          ordenGlobal: result.patient.globalOrder,
        },
        turnos: result.turnos.map((t) => ({
          id: t.id,
          areaId: t.areaId,
          areaNombre: t.areaName,
          label: `${t.areaPrefix}-${t.areaOrder}`,
          ordenArea: t.areaOrder,
          status: t.status,
        })),
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
