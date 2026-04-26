'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { CreateBrigadeUseCase } from '@/src/brigades/application/use-cases/create-brigade'

export async function createBrigadeAction(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const name = formData.get('name') as string
  const location = formData.get('location') as string
  const dateStr = formData.get('date') as string
  const areasJson = formData.get('areas') as string

  if (!name || !location || !dateStr) {
    redirect('/dashboard/brigades/new?error=Completa+todos+los+campos+requeridos')
  }

  const areas: { name: string; prefix: string; color: string }[] = JSON.parse(areasJson || '[]')

  const repo = new PrismaBrigadeRepository(prisma)
  const brigade = await new CreateBrigadeUseCase(repo).execute({
    name,
    description: null,
    location,
    date: new Date(dateStr),
    createdBy: user.id,
    creatorEmail: user.email ?? '',
  })

  if (areas.length > 0) {
    const { PrismaAreaRepository } = await import('@/src/areas/infrastructure/prisma-area-repository')
    const { CreateAreaUseCase } = await import('@/src/areas/application/use-cases/create-area')
    const areaRepo = new PrismaAreaRepository(prisma)
    for (let i = 0; i < areas.length; i++) {
      const area = areas[i]
      if (area.name && area.prefix) {
        await new CreateAreaUseCase(areaRepo).execute({
          brigadeId: brigade.id,
          userId: user.id,
          name: area.name,
          prefix: area.prefix,
          color: area.color,
          patientLimit: null,
          order: i + 1,
        })
      }
    }
  }

  redirect(`/dashboard/brigades/${brigade.id}`)
}
