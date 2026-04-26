/**
 * Development seed — creates realistic brigade data for local testing.
 *
 * Run: bun run db:seed
 *
 * Creates:
 *  - 2 auth users (director + staff)
 *  - 1 ACTIVE brigade with 3 areas
 *  - 10 patients with turnos in mixed states (WAITING, CALLED, SERVED)
 *
 * Safe to re-run: deletes [SEED] brigade before recreating.
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../shared/prisma/generated/client'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!SUPABASE_URL || !SERVICE_KEY || !DATABASE_URL) {
  console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })

// ─── Test users ────────────────────────────────────────────────────────────────

const TEST_USERS = [
  {
    email: 'director@brigada.test',
    password: 'brigada1234',
    fullName: 'Carlos Reyes',
    role: 'DIRECTOR' as const,
  },
  {
    email: 'staff@brigada.test',
    password: 'brigada1234',
    fullName: 'Ana López',
    role: 'STAFF' as const,
  },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function getOrCreateUser(email: string, password: string, fullName: string) {
  const { data: list } = await supabase.auth.admin.listUsers()
  const existing = list?.users.find((u) => u.email === email)
  if (existing) {
    console.log(`  ↩  user exists: ${email}`)
    return existing.id
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  console.log(`  ✓  created user: ${email}`)
  return data.user.id
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 Seeding development data...\n')

  // 1. Auth users
  console.log('👤 Users')
  const [directorId, staffId] = await Promise.all(
    TEST_USERS.map((u) => getOrCreateUser(u.email, u.password, u.fullName)),
  )

  // 2. Clean existing seed brigade
  await prisma.brigade.deleteMany({ where: { name: { startsWith: '[SEED]' } } })
  console.log('\n🗑  Cleaned previous [SEED] brigades')

  // 3. Brigade
  const brigade = await prisma.brigade.create({
    data: {
      name: '[SEED] Brigada Comunitaria Norte',
      description: 'Brigada de prueba para desarrollo local.',
      location: 'Col. Las Flores, Monterrey, N.L.',
      date: new Date('2026-04-19'),
      status: 'ACTIVE',
      openedAt: new Date('2026-04-19T08:00:00Z'),
      createdBy: directorId,
      members: {
        create: [
          {
            email: TEST_USERS[0].email,
            role: 'DIRECTOR',
            profileId: directorId,
            acceptedAt: new Date(),
          },
          {
            email: TEST_USERS[1].email,
            role: 'STAFF',
            profileId: staffId,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  })
  console.log(`\n🏥 Brigade: ${brigade.name} (${brigade.id})`)

  // 4. Areas
  const areasData = [
    { name: 'Dental', prefix: 'D', color: '#4F86C6', order: 1 },
    { name: 'Enfermería', prefix: 'ENF', color: '#52C78D', order: 2 },
    { name: 'Medicina General', prefix: 'MG', color: '#E67E22', order: 3 },
  ]

  const areas = await Promise.all(
    areasData.map((a) =>
      prisma.area.create({
        data: { ...a, brigadeId: brigade.id, patientLimit: null },
      }),
    ),
  )
  console.log(`\n🏷  Areas: ${areas.map((a) => a.name).join(', ')}`)

  const [dental, enfermeria, medicinaGeneral] = areas

  // 5. Patients + turnos
  //
  // Scenario:
  //   Dental:           1 CALLED, 5 WAITING, 2 SERVED
  //   Enfermería:       1 CALLED, 3 WAITING, 1 SERVED
  //   Medicina General: 3 WAITING, 1 SERVED
  //
  // globalOrder 1-10 (10 patients total)

  const patientsData = [
    {
      fullName: 'Juan Pérez Sánchez',
      age: 42,
      gender: 'male',
      phone: '81-1001-0001',
      address: 'Av. Constitución 100',
    },
    {
      fullName: 'María García López',
      age: 35,
      gender: 'female',
      phone: '81-1001-0002',
      address: 'Calle Roble 12',
    },
    {
      fullName: 'Roberto Martínez',
      age: 67,
      gender: 'male',
      phone: '81-1001-0003',
      address: 'Col. Centro 45',
    },
    {
      fullName: 'Laura González',
      age: 28,
      gender: 'female',
      phone: '81-1001-0004',
      address: 'Privada Olivos 8',
    },
    {
      fullName: 'Héctor Ramírez',
      age: 55,
      gender: 'male',
      phone: '81-1001-0005',
      address: 'Blvd. Norte 200',
    },
    { fullName: 'Sofía Torres', age: 19, gender: 'female', phone: '81-1001-0006', address: 'Calle Pinos 3' },
    { fullName: 'Andrés Flores', age: 73, gender: 'male', phone: '81-1001-0007', address: 'Av. Juárez 55' },
    { fullName: 'Carmen Vega', age: 44, gender: 'female', phone: '81-1001-0008', address: 'Calle Cedro 22' },
    {
      fullName: 'Miguel Ángel Cruz',
      age: 31,
      gender: 'male',
      phone: '81-1001-0009',
      address: 'Col. Nueva 14',
    },
    {
      fullName: 'Patricia Morales',
      age: 60,
      gender: 'female',
      phone: '81-1001-0010',
      address: 'Priv. Sur 7',
    },
  ]

  // areaOrder counters
  const orderCounters: Record<string, number> = {
    [dental.id]: 0,
    [enfermeria.id]: 0,
    [medicinaGeneral.id]: 0,
  }

  function nextOrder(areaId: string) {
    orderCounters[areaId]++
    return orderCounters[areaId]
  }

  // Turno plan: [areaId, status, calledAt?, servedAt?]
  type TurnoPlan = [string, 'WAITING' | 'CALLED' | 'SERVED', Date?, Date?]

  const called = new Date('2026-04-19T10:30:00Z')
  const served = (offset: number) => new Date(Date.UTC(2026, 3, 19, 9, offset))

  const turnoPlan: TurnoPlan[][] = [
    // Patient 1 — dental SERVED + MG WAITING
    [
      [dental.id, 'SERVED', called, served(5)],
      [medicinaGeneral.id, 'WAITING'],
    ],
    // Patient 2 — dental CALLED + enfermería WAITING
    [
      [dental.id, 'CALLED', called],
      [enfermeria.id, 'WAITING'],
    ],
    // Patient 3 — dental WAITING + MG WAITING
    [
      [dental.id, 'WAITING'],
      [medicinaGeneral.id, 'WAITING'],
    ],
    // Patient 4 — enfermería CALLED
    [[enfermeria.id, 'CALLED', called]],
    // Patient 5 — dental WAITING
    [[dental.id, 'WAITING']],
    // Patient 6 — enfermería SERVED + MG SERVED
    [
      [enfermeria.id, 'SERVED', called, served(15)],
      [medicinaGeneral.id, 'SERVED', called, served(20)],
    ],
    // Patient 7 — dental WAITING
    [[dental.id, 'WAITING']],
    // Patient 8 — dental SERVED + enfermería WAITING
    [
      [dental.id, 'SERVED', called, served(25)],
      [enfermeria.id, 'WAITING'],
    ],
    // Patient 9 — dental WAITING
    [[dental.id, 'WAITING']],
    // Patient 10 — enfermería WAITING
    [[enfermeria.id, 'WAITING']],
  ]

  for (let i = 0; i < patientsData.length; i++) {
    const pd = patientsData[i]
    const plan = turnoPlan[i]

    const patient = await prisma.patient.create({
      data: {
        brigadeId: brigade.id,
        fullName: pd.fullName,
        age: pd.age,
        gender: pd.gender,
        phone: pd.phone,
        address: pd.address,
        wantsChurchVisit: i % 3 === 0,
        globalOrder: i + 1,
        registeredBy: staffId,
      },
    })

    for (const [areaId, status, calledAt, servedAt] of plan) {
      await prisma.turno.create({
        data: {
          brigadeId: brigade.id,
          areaId,
          patientId: patient.id,
          areaOrder: nextOrder(areaId),
          status,
          calledAt: calledAt ?? null,
          servedAt: servedAt ?? null,
        },
      })
    }
  }

  // Summary
  const counts = await prisma.turno.groupBy({
    by: ['status'],
    where: { brigadeId: brigade.id },
    _count: true,
  })
  const countMap = Object.fromEntries(counts.map((c) => [c.status, c._count]))

  console.log('\n📊 Turnos:')
  console.log(`   WAITING : ${countMap['WAITING'] ?? 0}`)
  console.log(`   CALLED  : ${countMap['CALLED'] ?? 0}`)
  console.log(`   SERVED  : ${countMap['SERVED'] ?? 0}`)

  console.log('\n✅ Seed complete!\n')
  console.log('  🔐 director@brigada.test  /  brigada1234')
  console.log('  🔐 staff@brigada.test     /  brigada1234\n')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
