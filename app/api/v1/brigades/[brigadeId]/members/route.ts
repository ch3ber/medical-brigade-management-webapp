import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { ListMembersUseCase } from '@/src/members/application/use-cases/list-members'
import { InviteMemberUseCase } from '@/src/members/application/use-cases/invite-member'
import { GenerateStaffCredentialsUseCase } from '@/src/members/application/use-cases/generate-staff-credentials'
import type { BrigadeMember } from '@/src/members/domain/entities/BrigadeMember'

const inviteSchema = z.object({
  modo: z.literal('invitacion'),
  email: z.string().email('El correo no es válido.'),
  rol: z.enum(['STAFF', 'CO_DIRECTOR']).optional().default('STAFF'),
})

const credencialesSchema = z.object({
  modo: z.literal('credenciales'),
  email: z.string().email('El correo no es válido.'),
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres.'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

const postSchema = z.discriminatedUnion('modo', [inviteSchema, credencialesSchema])

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
  MIEMBRO_YA_EXISTE: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  MIEMBRO_YA_EXISTE: 'Ya existe un miembro con ese correo en esta brigada.',
}

function mapMember(m: BrigadeMember) {
  return {
    id: m.id,
    email: m.email,
    rol: m.role,
    aceptadoEn: m.acceptedAt,
    retenerAccesoAlCerrar: m.retainAccessAfterClose,
    modoCredenciales: m.hasGeneratedCredentials(),
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
    const repo = new PrismaMemberRepository(prisma)
    const members = await new ListMembersUseCase(repo).execute({ brigadeId, userId: user.id })
    return ok(members.map(mapMember))
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
    const fields = parsed.error.issues.map((i) => ({
      field: String(i.path[0] ?? 'unknown'),
      message: i.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  try {
    const repo = new PrismaMemberRepository(prisma)
    let member: BrigadeMember

    if (parsed.data.modo === 'invitacion') {
      member = await new InviteMemberUseCase(repo).execute({
        brigadeId,
        userId: user.id,
        email: parsed.data.email,
        role: parsed.data.rol,
      })
    } else {
      member = await new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId,
        userId: user.id,
        email: parsed.data.email,
        generatedUsername: parsed.data.usuario,
        plainPassword: parsed.data.contrasena,
      })
    }

    return ok(
      {
        id: member.id,
        email: member.email,
        rol: member.role,
        modo: parsed.data.modo,
        tokenInvitacion: member.inviteToken,
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
