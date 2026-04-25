import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { UpdateMemberRoleUseCase } from '@/src/members/application/use-cases/update-member-role'
import { RemoveMemberUseCase } from '@/src/members/application/use-cases/remove-member'

const patchSchema = z.object({
  rol: z.enum(['STAFF', 'CO_DIRECTOR', 'DIRECTOR']).optional(),
  retenerAccesoAlCerrar: z.boolean().optional(),
})

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  MIEMBRO_NO_ENCONTRADO: 404,
  NO_PUEDE_ELIMINARSE_A_SI_MISMO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  MIEMBRO_NO_ENCONTRADO: 'El miembro solicitado no existe.',
  NO_PUEDE_ELIMINARSE_A_SI_MISMO: 'No puedes eliminarte a ti mismo de la brigada.',
}

type RouteParams = { params: Promise<{ brigadeId: string; memberId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { brigadeId, memberId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400)

  try {
    const repo = new PrismaMemberRepository(prisma)
    const member = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId,
      memberId,
      userId: user.id,
      role: parsed.data.rol,
      retainAccessAfterClose: parsed.data.retenerAccesoAlCerrar,
    })
    return ok({
      id: member.id,
      email: member.email,
      rol: member.role,
      retenerAccesoAlCerrar: member.retainAccessAfterClose,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { brigadeId, memberId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaMemberRepository(prisma)
    await new RemoveMemberUseCase(repo).execute({ brigadeId, memberId, userId: user.id })
    return ok(null)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
