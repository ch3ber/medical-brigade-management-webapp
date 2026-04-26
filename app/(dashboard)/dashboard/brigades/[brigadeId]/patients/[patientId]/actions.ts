'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { AddPatientToAreaUseCase } from '@/src/patients/application/use-cases/add-patient-to-area'

export async function addPatientToAreaAction(brigadeId: string, patientId: string, areaId: string) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const repo = new PrismaPatientRepository(prisma)
  const turno = await new AddPatientToAreaUseCase(repo).execute({
    brigadeId,
    patientId,
    areaId,
    userId: user.id,
  })

  redirect(`/dashboard/brigades/${brigadeId}/patients/${patientId}/ticket`)
}
