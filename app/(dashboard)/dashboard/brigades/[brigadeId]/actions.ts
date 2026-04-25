'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { UpdateBrigadeUseCase } from '@/src/brigades/application/use-cases/update-brigade'
import { CreateAreaUseCase } from '@/src/areas/application/use-cases/create-area'
import { UpdateAreaUseCase } from '@/src/areas/application/use-cases/update-area'
import { DeleteAreaUseCase } from '@/src/areas/application/use-cases/delete-area'

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function updateBrigadeAction(brigadeId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const dateStr = formData.get('date') as string

  const repo = new PrismaBrigadeRepository(prisma)
  await new UpdateBrigadeUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    data: {
      ...(name && { name }),
      ...(location && { location }),
      ...(dateStr && { date: new Date(dateStr) }),
    },
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}`)
  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function createAreaAction(brigadeId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const prefix = formData.get('prefix') as string
  const color = formData.get('color') as string

  const repo = new PrismaAreaRepository(prisma)
  await new CreateAreaUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    name,
    prefix,
    color,
    patientLimit: null,
    order: 999,
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function updateAreaAction(brigadeId: string, areaId: string, formData: FormData) {
  const user = await getAuthUser()

  const name = formData.get('name') as string
  const prefix = formData.get('prefix') as string
  const color = formData.get('color') as string

  const repo = new PrismaAreaRepository(prisma)
  await new UpdateAreaUseCase(repo).execute({
    brigadeId,
    areaId,
    userId: user.id,
    data: {
      ...(name && { name }),
      ...(prefix && { prefix }),
      ...(color && { color }),
    },
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}

export async function deleteAreaAction(brigadeId: string, areaId: string) {
  const user = await getAuthUser()

  const repo = new PrismaAreaRepository(prisma)
  await new DeleteAreaUseCase(repo).execute({ brigadeId, areaId, userId: user.id })

  revalidatePath(`/dashboard/brigades/${brigadeId}/settings`)
}
