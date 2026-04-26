'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { createSupabaseAdminClient } from '@/shared/supabase/admin'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { InviteMemberUseCase } from '@/src/members/application/use-cases/invite-member'
import { GenerateStaffCredentialsUseCase } from '@/src/members/application/use-cases/generate-staff-credentials'
import { RemoveMemberUseCase } from '@/src/members/application/use-cases/remove-member'

async function getAuthUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

export async function inviteMemberAction(brigadeId: string, email: string): Promise<string> {
  const user = await getAuthUser()

  const repo = new PrismaMemberRepository(prisma)
  const member = await new InviteMemberUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    email,
    role: 'STAFF',
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/staff`)
  return `/invite/${member.inviteToken}`
}

export async function generateCredentialsAction(
  brigadeId: string,
  generatedUsername: string,
  plainPassword: string,
): Promise<void> {
  const user = await getAuthUser()
  const email = `${generatedUsername}@staff.local`

  const admin = createSupabaseAdminClient()
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: plainPassword,
    email_confirm: true,
  })
  if (error) throw new Error(error.message)

  const repo = new PrismaMemberRepository(prisma)
  await new GenerateStaffCredentialsUseCase(repo).execute({
    brigadeId,
    userId: user.id,
    email,
    generatedUsername,
    plainPassword,
    profileId: created.user.id,
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/staff`)
}

export async function removeMemberAction(brigadeId: string, memberId: string): Promise<void> {
  const user = await getAuthUser()

  const repo = new PrismaMemberRepository(prisma)
  await new RemoveMemberUseCase(repo).execute({
    brigadeId,
    memberId,
    userId: user.id,
  })

  revalidatePath(`/dashboard/brigades/${brigadeId}/staff`)
}
