import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaBrigadeRepository } from '@/src/brigades/infrastructure/prisma-brigade-repository'
import { PrismaAreaRepository } from '@/src/areas/infrastructure/prisma-area-repository'
import { GetBrigadeUseCase } from '@/src/brigades/application/use-cases/get-brigade'
import { ListAreasUseCase } from '@/src/areas/application/use-cases/list-areas'
import { SettingsClient } from '../settings-client'
import { updateBrigadeAction } from '../actions'

interface Props {
  params: Promise<{ brigadeId: string }>
}

export default async function BrigadeSettingsPage({ params }: Props) {
  const { brigadeId } = await params

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [brigade, areas] = await Promise.all([
    new GetBrigadeUseCase(new PrismaBrigadeRepository(prisma))
      .execute({ brigadeId, userId: user.id })
      .catch(() => null),
    new ListAreasUseCase(new PrismaAreaRepository(prisma)).execute({ brigadeId, userId: user.id }),
  ])

  if (!brigade) notFound()

  const updateBrigade = updateBrigadeAction.bind(null, brigadeId)

  return (
    <>
      <PageHeader
        title="Configuración"
        backHref={`/dashboard/brigades/${brigadeId}`}
      />

      <div className="space-y-6 px-5 pt-2 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>Información de la brigada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form action={updateBrigade}>
              <label className="block">
                <span className="ml-2 text-xs text-[var(--muted)]">Nombre</span>
                <Input
                  name="name"
                  defaultValue={brigade.name}
                  className="mt-1"
                />
              </label>
              <label className="mt-3 block">
                <span className="ml-2 text-xs text-[var(--muted)]">Lugar</span>
                <Input
                  name="location"
                  defaultValue={brigade.location}
                  className="mt-1"
                />
              </label>
              <label className="mt-3 block">
                <span className="ml-2 text-xs text-[var(--muted)]">Fecha</span>
                <Input
                  type="date"
                  name="date"
                  defaultValue={brigade.date.toISOString().split('T')[0]}
                  className="mt-1"
                />
              </label>
              <Button
                size="md"
                className="mt-4 w-full"
                type="submit"
              >
                Guardar cambios
              </Button>
            </form>
          </CardContent>
        </Card>

        <SettingsClient
          brigadeId={brigadeId}
          initialAreas={areas.map((a) => ({
            id: a.id,
            name: a.name,
            prefix: a.prefix,
            color: a.color,
          }))}
        />
      </div>
    </>
  )
}
