# Members Slice — Design Spec

**Date:** 2026-04-24  
**Status:** Approved  
**Scope:** `src/members/` domain + application layers, `infrastructure/prisma-member-repository.ts`, API route handlers, `accept-invite` server action

---

## Context

The `members` slice manages brigade membership: inviting staff via link, generating credentials for non-registered staff, accepting invitations, updating roles, and removing members. The slice folder exists with empty directories. This spec defines the full implementation.

---

## Decisions

| Question                   | Decision                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Password hashing           | `bcryptjs` (cost factor 12). Install `bcryptjs` + `@types/bcryptjs`.                                                 |
| Invite email delivery      | Out of scope v1. API returns `inviteToken` in response; director shares link manually.                               |
| `accept-invite` entrypoint | Server Action in `app/(auth)/invite/[token]/page.tsx`. No separate API route.                                        |
| Member creation modes      | Two separate use cases: `invite-member` and `generate-staff-credentials`. Route handler dispatches via `modo` field. |

---

## 1. Domain

### `src/members/domain/entities/BrigadeMember.ts`

```typescript
export type BrigadeRole = 'DIRECTOR' | 'CO_DIRECTOR' | 'STAFF'

export interface BrigadeMemberProps {
  id: string
  brigadeId: string
  profileId: string | null
  email: string
  role: BrigadeRole
  generatedUsername: string | null
  inviteToken: string | null
  invitedAt: Date
  acceptedAt: Date | null
  retainAccessAfterClose: boolean
  createdAt: Date
  updatedAt: Date
}

export class BrigadeMember {
  // All props readonly, assigned in constructor

  isPending(): boolean // acceptedAt === null
  hasGeneratedCredentials(): boolean // generatedUsername !== null
  isEditable(): boolean // always true in v1 (no closed-brigade member lock)
}
```

### `src/members/domain/repositories/IMemberRepository.ts`

```typescript
export type { BrigadeRole } from '../entities/BrigadeMember'

export interface CreateInviteMemberData {
  brigadeId: string
  email: string
  role: BrigadeRole
  inviteToken: string
}

export interface CreateCredentialsMemberData {
  brigadeId: string
  email: string
  generatedUsername: string
  plainPassword: string // repo hashes before storing
  role: 'STAFF' // always STAFF for generated credentials
}

export interface UpdateMemberData {
  role?: BrigadeRole
  retainAccessAfterClose?: boolean
}

export interface IMemberRepository {
  findAllByBrigade(brigadeId: string, userId: string): Promise<BrigadeMember[]>
  findById(id: string, brigadeId: string): Promise<BrigadeMember | null>
  findByInviteToken(token: string): Promise<BrigadeMember | null>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  existsByEmail(brigadeId: string, email: string): Promise<boolean>
  createInvite(data: CreateInviteMemberData): Promise<BrigadeMember>
  createWithCredentials(data: CreateCredentialsMemberData): Promise<BrigadeMember>
  update(id: string, data: UpdateMemberData): Promise<BrigadeMember>
  delete(id: string): Promise<void>
  acceptInvite(token: string, profileId: string): Promise<BrigadeMember>
}
```

**Notes:**

- `BrigadeRole` defined in the entity and re-exported from the repository interface. Same pattern as `IBrigadeRepository.ts`.
- `getMemberRole` checks `profiles.role === PLATFORM_ADMIN` → returns `'DIRECTOR'`. Same pattern as `PrismaAreaRepository`.
- `createWithCredentials` receives `plainPassword`; the Prisma repo hashes it with `bcryptjs.hash(plainPassword, 12)` before persisting.

---

## 2. Application

All use cases follow the constructor injection pattern: `constructor(private readonly repo: IMemberRepository)`.

### `invite-member.ts`

```
Input: { brigadeId, userId, email, role: 'STAFF' | 'CO_DIRECTOR' }

1. getMemberRole(brigadeId, userId) → must be DIRECTOR or CO_DIRECTOR → else SIN_PERMISO
2. existsByEmail(brigadeId, email) → if true → MIEMBRO_YA_EXISTE
3. repo.createInvite({ brigadeId, email, role, inviteToken: crypto.randomUUID() })

Output: BrigadeMember
```

### `generate-staff-credentials.ts`

```
Input: { brigadeId, userId, email, generatedUsername, plainPassword }

1. getMemberRole(brigadeId, userId) → must be DIRECTOR or CO_DIRECTOR → else SIN_PERMISO
2. existsByEmail(brigadeId, email) → if true → MIEMBRO_YA_EXISTE
3. role forced to 'STAFF' (generated credentials are always STAFF — locked decision)
4. repo.createWithCredentials({ brigadeId, email, generatedUsername, plainPassword, role: 'STAFF' })

Output: BrigadeMember
```

### `accept-invite.ts`

```
Input: { token, profileId }

1. findByInviteToken(token) → if null → MIEMBRO_NO_ENCONTRADO
2. member.isPending() === false → INVITACION_YA_ACEPTADA
3. repo.acceptInvite(token, profileId)

Output: BrigadeMember (caller uses brigadeId for redirect)
```

### `update-member-role.ts`

```
Input: { brigadeId, memberId, userId, role?, retainAccessAfterClose? }

1. getMemberRole(brigadeId, userId) → must be DIRECTOR or CO_DIRECTOR → else SIN_PERMISO
2. findById(memberId, brigadeId) → if null → MIEMBRO_NO_ENCONTRADO
3. repo.update(memberId, { role, retainAccessAfterClose })

Output: BrigadeMember
```

### `remove-member.ts`

```
Input: { brigadeId, memberId, userId }

1. getMemberRole(brigadeId, userId) → must be DIRECTOR or CO_DIRECTOR → else SIN_PERMISO
2. findById(memberId, brigadeId) → if null → MIEMBRO_NO_ENCONTRADO
3. member.profileId === userId → NO_PUEDE_ELIMINARSE_A_SI_MISMO
4. repo.delete(memberId)

Output: void
```

### Error codes

| Code                             | HTTP | Message (ES)                                         |
| -------------------------------- | ---- | ---------------------------------------------------- |
| `MIEMBRO_NO_ENCONTRADO`          | 404  | El miembro solicitado no existe.                     |
| `MIEMBRO_YA_EXISTE`              | 409  | Ya existe un miembro con ese correo en esta brigada. |
| `INVITACION_YA_ACEPTADA`         | 409  | Esta invitación ya fue aceptada.                     |
| `NO_PUEDE_ELIMINARSE_A_SI_MISMO` | 409  | No puedes eliminarte a ti mismo de la brigada.       |

---

## 3. Infrastructure

### `src/members/infrastructure/prisma-member-repository.ts`

Pattern: `PrismaMemberRow` type → `toDomain()` mapper → `PrismaMemberRepository implements IMemberRepository`.

Key implementation notes:

- `getMemberRole`: same parallel query pattern as `PrismaAreaRepository` — checks `profiles.role === PLATFORM_ADMIN` first.
- `createWithCredentials`: calls `bcryptjs.hash(data.plainPassword, 12)` before `prisma.brigadeMember.create`.
- `acceptInvite`: `prisma.brigadeMember.update({ where: { inviteToken: token }, data: { profileId, acceptedAt: new Date() } })`.
- `findAllByBrigade`: filters by `brigade.members.some({ profileId: userId })` for RLS-equivalent access control.

### API route handlers

#### `app/api/v1/brigades/[brigadeId]/members/route.ts` — GET + POST

**GET**: `ListMembersUseCase` (simple `findAllByBrigade`). Director or co-director only.

**POST**: `z.discriminatedUnion('modo', [inviteSchema, credencialesSchema])`. Dispatches to `InviteMemberUseCase` or `GenerateStaffCredentialsUseCase` based on `modo`.

```typescript
const inviteSchema = z.object({
  modo: z.literal('invitacion'),
  email: z.string().email(),
  rol: z.enum(['STAFF', 'CO_DIRECTOR']).optional().default('STAFF'),
})

const credencialesSchema = z.object({
  modo: z.literal('credenciales'),
  email: z.string().email(),
  usuario: z.string().min(3),
  contrasena: z.string().min(8),
})

const postSchema = z.discriminatedUnion('modo', [inviteSchema, credencialesSchema])
```

Response `201` for POST (follows API doc shape exactly).

#### `app/api/v1/brigades/[brigadeId]/members/[memberId]/route.ts` — PATCH + DELETE

**PATCH**: `UpdateMemberRoleUseCase`. Body: `{ rol?, retenerAccesoAlCerrar? }`.  
**DELETE**: `RemoveMemberUseCase`. No body.

### Server Action — `accept-invite`

Located in `app/(auth)/invite/[token]/page.tsx` as a server action. Calls `AcceptInviteUseCase(new PrismaMemberRepository(prisma)).execute({ token, profileId })` then redirects to `/brigades/[brigadeId]`.

---

## 4. Tests

Unit tests for every use case (mock repository). Unit test for `BrigadeMember` entity methods.

```
src/members/
  domain/entities/tests/unit/BrigadeMember.test.ts
  application/use-cases/tests/unit/
    invite-member.test.ts
    generate-staff-credentials.test.ts
    accept-invite.test.ts
    update-member-role.test.ts
    remove-member.test.ts
```

Each use case test covers: happy path, permission denied, not found, conflict (duplicate email, already accepted, self-remove).

---

## 5. Full file list

```
# New dependency
bcryptjs + @types/bcryptjs

# src/members/
domain/entities/BrigadeMember.ts
domain/entities/tests/unit/BrigadeMember.test.ts
domain/repositories/IMemberRepository.ts

application/use-cases/invite-member.ts
application/use-cases/generate-staff-credentials.ts
application/use-cases/accept-invite.ts
application/use-cases/update-member-role.ts
application/use-cases/remove-member.ts
application/use-cases/tests/unit/invite-member.test.ts
application/use-cases/tests/unit/generate-staff-credentials.test.ts
application/use-cases/tests/unit/accept-invite.test.ts
application/use-cases/tests/unit/update-member-role.test.ts
application/use-cases/tests/unit/remove-member.test.ts

infrastructure/prisma-member-repository.ts

# app/
api/v1/brigades/[brigadeId]/members/route.ts
api/v1/brigades/[brigadeId]/members/[memberId]/route.ts
(auth)/invite/[token]/page.tsx   ← modified (add server action)
```

**Out of scope v1:**

- Domain events (`MemberInvited`, `MemberAcceptedInvite`)
- Value objects (`BrigadeRole.ts`, `InviteToken.ts`) — logic stays in entity and interface
- UI components (`MemberList.tsx`, `InviteMemberDialog.tsx`)
- Email delivery for invite links
