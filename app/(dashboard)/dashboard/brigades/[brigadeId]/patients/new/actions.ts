'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaPatientRepository } from '@/src/patients/infrastructure/prisma-patient-repository'
import { RegisterPatientUseCase } from '@/src/patients/application/use-cases/register-patient'

export async function registerPatientAction(brigadeId: string, formData: FormData) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const fullName = formData.get('fullName') as string
  const age = parseInt(formData.get('age') as string, 10)
  const gender = (formData.get('gender') as string) || ''
  const phone = (formData.get('phone') as string) || ''
  const address = (formData.get('address') as string) || ''
  const wantsChurchVisit = formData.get('wantsChurchVisit') === 'true'
  const areaIds = formData.getAll('areaIds') as string[]

  const repo = new PrismaPatientRepository(prisma)
  const result = await new RegisterPatientUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    fullName,
    age,
    gender,
    phone,
    address,
    wantsChurchVisit,
    areaIds,
  })

  redirect(`/dashboard/brigades/${brigadeId}/patients/${result.patient.id}/ticket`)
}
