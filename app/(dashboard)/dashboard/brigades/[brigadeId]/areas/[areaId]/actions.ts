'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaTurnoRepository } from '@/src/turnos/infrastructure/prisma-turno-repository'
import { CallNextTurnoUseCase } from '@/src/turnos/application/use-cases/call-next-turno'
import { MoveTurnoToTailUseCase } from '@/src/turnos/application/use-cases/move-turno-to-tail'
import { RemoveTurnoUseCase } from '@/src/turnos/application/use-cases/remove-turno'

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function callNextAction(brigadeId: string, areaId: string) {
  const user = await getAuthUser()
  const repo = new PrismaTurnoRepository(prisma)
  await new CallNextTurnoUseCase(repo).execute({ brigadeId, areaId, userId: user.id })
  revalidatePath(`/dashboard/brigades/${brigadeId}/areas/${areaId}`)
}

export async function moveTurnoAction(brigadeId: string, areaId: string, turnoId: string) {
  const user = await getAuthUser()
  const repo = new PrismaTurnoRepository(prisma)
  await new MoveTurnoToTailUseCase(repo).execute({ brigadeId, areaId, turnoId, userId: user.id })
  revalidatePath(`/dashboard/brigades/${brigadeId}/areas/${areaId}`)
}

export async function removeTurnoAction(brigadeId: string, areaId: string, turnoId: string) {
  const user = await getAuthUser()
  const repo = new PrismaTurnoRepository(prisma)
  await new RemoveTurnoUseCase(repo).execute({ brigadeId, areaId, turnoId, userId: user.id })
  revalidatePath(`/dashboard/brigades/${brigadeId}/areas/${areaId}`)
}
