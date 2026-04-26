import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { GetPatientDetailUseCase } from '@/src/patients/application/use-cases/get-patient-detail'

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  PACIENTE_NO_ENCONTRADO: 404,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  PACIENTE_NO_ENCONTRADO: 'El paciente solicitado no existe.',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brigadeId: string; patientId: string }> },
) {
  const { brigadeId, patientId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaPatientRepository(prisma)
    const patient = await new GetPatientDetailUseCase(repo).execute({
      brigadeId,
      patientId,
      userId: user.id,
    })

    return ok({
      id: patient.id,
      nombreCompleto: patient.fullName,
      edad: patient.age,
      genero: patient.gender,
      telefono: patient.phone,
      direccion: patient.address,
      quiereVisitaIglesia: patient.wantsChurchVisit,
      ordenGlobal: patient.globalOrder,
      registradoEn: patient.createdAt.toISOString(),
      turnos: patient.turnos.map((t) => ({
        id: t.id,
        areaId: t.areaId,
        areaNombre: t.areaName,
        label: `${t.areaPrefix}-${t.areaOrder}`,
        status: t.status,
        vecesMovido: t.movedCount,
      })),
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
