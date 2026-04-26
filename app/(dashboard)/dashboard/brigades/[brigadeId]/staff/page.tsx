import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { ListMembersUseCase } from '@/src/members/application/use-cases/list-members'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { StaffManager, type StaffMemberDisplay } from '@/src/members/infrastructure/components/StaffManager'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function StaffPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigade, members] = await Promise.all([
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
    new ListMembersUseCase(new PrismaMemberRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
  ])

  if (!brigade || !members) notFound()

  // Fetch profile names for accepted members (profileId != null)
  const acceptedProfileIds = members.map((m) => m.profileId).filter((id): id is string => id !== null)

  const profiles =
    acceptedProfileIds.length > 0
      ? await prisma.profile.findMany({
          where: { id: { in: acceptedProfileIds } },
          select: { id: true, fullName: true },
        })
      : []

  const nameById = Object.fromEntries(profiles.map((p) => [p.id, p.fullName ?? p.id]))

  const memberDisplays: StaffMemberDisplay[] = members.map((m) => {
    const displayName = m.profileId
      ? (nameById[m.profileId] ?? m.email)
      : m.generatedUsername
        ? m.generatedUsername
        : m.email

    return {
      id: m.id,
      displayName,
      email: m.generatedUsername ? `${m.generatedUsername}@staff.local` : m.email,
      role: m.role,
      isPending: m.isPending(),
      hasCredentials: m.hasGeneratedCredentials(),
      isCurrentUser: m.profileId === user.id,
    }
  })

  return (
    <>
      <PageHeader
        title="Personal"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />

      <div className="px-5 pt-3 pb-6">
        <p className="mb-5 text-sm text-[var(--muted)]">
          Miembros de <span className="font-semibold text-[var(--foreground)]">{brigade.name}</span>
        </p>
        <StaffManager
          brigadeId={brigadeId}
          members={memberDisplays}
          isClosed={brigade.status === 'CLOSED'}
        />
      </div>
    </>
  )
}
