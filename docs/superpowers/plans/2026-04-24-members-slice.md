# Members Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full `members` slice — entity, repository interface, 6 use cases, Prisma repository, API route handlers, and invite page wiring.

**Architecture:** Clean Architecture + Vertical Slicing. `BrigadeMember` entity and `IMemberRepository` live in `domain/`. Six use cases in `application/` depend only on the interface. `PrismaMemberRepository` in `infrastructure/` hashes passwords with `bcryptjs` (cost 12) — the use cases never touch bcrypt. Two route handlers in `app/api/v1/` dispatch to the correct use case. The existing invite page gets wired to real DB data and a server action.

**Tech Stack:** TypeScript 5, Prisma 5, bcryptjs, Zod, Vitest, Next.js 14 App Router

**Spec:** `docs/superpowers/specs/2026-04-24-members-slice-design.md`

---

## File Map

| File                                                              | Action | What it does                               |
| ----------------------------------------------------------------- | ------ | ------------------------------------------ |
| `package.json`                                                    | Modify | Add bcryptjs + @types/bcryptjs             |
| `src/members/domain/entities/BrigadeMember.ts`                    | Create | Entity class + BrigadeRole type            |
| `src/members/domain/entities/tests/unit/BrigadeMember.test.ts`    | Create | Unit tests for entity methods              |
| `src/members/domain/repositories/IMemberRepository.ts`            | Create | Repository interface                       |
| `src/members/application/use-cases/list-members.ts`               | Create | List members (director/co-director only)   |
| `src/members/application/use-cases/invite-member.ts`              | Create | Create invite-link member                  |
| `src/members/application/use-cases/generate-staff-credentials.ts` | Create | Create credentials member                  |
| `src/members/application/use-cases/accept-invite.ts`              | Create | Consume invite token                       |
| `src/members/application/use-cases/update-member-role.ts`         | Create | Change role / retain-access flag           |
| `src/members/application/use-cases/remove-member.ts`              | Create | Delete member row                          |
| `src/members/application/use-cases/tests/unit/*.test.ts`          | Create | Unit tests for all 6 use cases             |
| `src/members/infrastructure/prisma-member-repository.ts`          | Create | Prisma implementation                      |
| `app/api/v1/brigades/[brigadeId]/members/route.ts`                | Create | GET list + POST create                     |
| `app/api/v1/brigades/[brigadeId]/members/[memberId]/route.ts`     | Create | PATCH update + DELETE remove               |
| `app/(auth)/invite/[token]/page.tsx`                              | Modify | Wire real DB lookup + accept server action |

---

### Task 1: Install bcryptjs

**Files:**

- Modify: `package.json` (via bun add)

- [ ] **Step 1: Install**

```bash
bun add bcryptjs && bun add -d @types/bcryptjs
```

- [ ] **Step 2: Verify types resolve**

```bash
bun run tsc --noEmit
```

Expected: no errors about bcryptjs.

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore(members): install bcryptjs for password hashing"
```

---

### Task 2: BrigadeMember entity

**Files:**

- Create: `src/members/domain/entities/BrigadeMember.ts`
- Create: `src/members/domain/entities/tests/unit/BrigadeMember.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/domain/entities/tests/unit/BrigadeMember.test.ts
import { describe, it, expect } from 'vitest'
import { BrigadeMember, type BrigadeMemberProps } from '../../BrigadeMember'

const base: BrigadeMemberProps = {
  id: 'member-1',
  brigadeId: 'brigade-1',
  profileId: 'profile-1',
  email: 'staff@example.com',
  role: 'STAFF',
  generatedUsername: null,
  inviteToken: null,
  invitedAt: new Date('2026-01-01'),
  acceptedAt: new Date('2026-01-02'),
  retainAccessAfterClose: false,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('BrigadeMember', () => {
  describe('isPending', () => {
    it('returns true when acceptedAt is null', () => {
      const m = new BrigadeMember({ ...base, acceptedAt: null })
      expect(m.isPending()).toBe(true)
    })

    it('returns false when acceptedAt is set', () => {
      const m = new BrigadeMember(base)
      expect(m.isPending()).toBe(false)
    })
  })

  describe('hasGeneratedCredentials', () => {
    it('returns true when generatedUsername is set', () => {
      const m = new BrigadeMember({ ...base, generatedUsername: 'jperez' })
      expect(m.hasGeneratedCredentials()).toBe(true)
    })

    it('returns false when generatedUsername is null', () => {
      const m = new BrigadeMember(base)
      expect(m.hasGeneratedCredentials()).toBe(false)
    })
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/domain/entities/tests/unit/BrigadeMember.test.ts
```

Expected: FAIL — "Cannot find module '../../BrigadeMember'"

- [ ] **Step 3: Implement entity**

```typescript
// src/members/domain/entities/BrigadeMember.ts
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
  readonly id: string
  readonly brigadeId: string
  readonly profileId: string | null
  readonly email: string
  readonly role: BrigadeRole
  readonly generatedUsername: string | null
  readonly inviteToken: string | null
  readonly invitedAt: Date
  readonly acceptedAt: Date | null
  readonly retainAccessAfterClose: boolean
  readonly createdAt: Date
  readonly updatedAt: Date

  constructor(props: BrigadeMemberProps) {
    this.id = props.id
    this.brigadeId = props.brigadeId
    this.profileId = props.profileId
    this.email = props.email
    this.role = props.role
    this.generatedUsername = props.generatedUsername
    this.inviteToken = props.inviteToken
    this.invitedAt = props.invitedAt
    this.acceptedAt = props.acceptedAt
    this.retainAccessAfterClose = props.retainAccessAfterClose
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  isPending(): boolean {
    return this.acceptedAt === null
  }

  hasGeneratedCredentials(): boolean {
    return this.generatedUsername !== null
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/domain/entities/tests/unit/BrigadeMember.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/domain/entities/BrigadeMember.ts src/members/domain/entities/tests/unit/BrigadeMember.test.ts
git commit -m "feat(members): add BrigadeMember entity with tests"
```

---

### Task 3: IMemberRepository interface

**Files:**

- Create: `src/members/domain/repositories/IMemberRepository.ts`

No runtime behavior to test — TypeScript compilation is the verification.

- [ ] **Step 1: Create interface**

```typescript
// src/members/domain/repositories/IMemberRepository.ts
import type { BrigadeMember, BrigadeRole } from '../entities/BrigadeMember'

export type { BrigadeRole }

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
  plainPassword: string
  role: 'STAFF'
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

- [ ] **Step 2: Verify**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/members/domain/repositories/IMemberRepository.ts
git commit -m "feat(members): add IMemberRepository interface"
```

---

### Task 4: list-members use case

**Files:**

- Create: `src/members/application/use-cases/list-members.ts`
- Create: `src/members/application/use-cases/tests/unit/list-members.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/list-members.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ListMembersUseCase } from '../../list-members'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = () =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: 'profile-1',
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    inviteToken: null,
    invitedAt: new Date(),
    acceptedAt: new Date(),
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('ListMembersUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('returns members when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    const members = [makeMember()]
    vi.mocked(repo.findAllByBrigade).mockResolvedValue(members)

    const result = await new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toEqual(members)
  })

  it('returns members when caller is CO_DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.findAllByBrigade).mockResolvedValue([])

    const result = await new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' })

    expect(result).toEqual([])
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws SIN_PERMISO when caller has no brigade membership', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue(null)

    await expect(
      new ListMembersUseCase(repo).execute({ brigadeId: 'brigade-1', userId: 'user-1' }),
    ).rejects.toThrow('SIN_PERMISO')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/list-members.test.ts
```

Expected: FAIL — "Cannot find module '../../list-members'"

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/list-members.ts
import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface ListMembersDto {
  brigadeId: string
  userId: string
}

export class ListMembersUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, userId }: ListMembersDto): Promise<BrigadeMember[]> {
    const role = await this.repo.getMemberRole(brigadeId, userId)
    if (role !== 'DIRECTOR' && role !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')
    return this.repo.findAllByBrigade(brigadeId, userId)
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/list-members.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/list-members.ts src/members/application/use-cases/tests/unit/list-members.test.ts
git commit -m "feat(members): add ListMembersUseCase with tests"
```

---

### Task 5: invite-member use case

**Files:**

- Create: `src/members/application/use-cases/invite-member.ts`
- Create: `src/members/application/use-cases/tests/unit/invite-member.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/invite-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { InviteMemberUseCase } from '../../invite-member'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    inviteToken: 'some-uuid',
    invitedAt: new Date(),
    acceptedAt: null,
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('InviteMemberUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('creates invite member when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createInvite).mockResolvedValue(makeMember())

    const result = await new InviteMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      email: 'staff@example.com',
      role: 'STAFF',
    })

    expect(result.email).toBe('staff@example.com')
    expect(repo.createInvite).toHaveBeenCalledWith(
      expect.objectContaining({
        brigadeId: 'brigade-1',
        email: 'staff@example.com',
        role: 'STAFF',
        inviteToken: expect.any(String),
      }),
    )
  })

  it('works when caller is CO_DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createInvite).mockResolvedValue(makeMember())

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).resolves.toBeDefined()
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_YA_EXISTE when email already in brigade', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(true)

    await expect(
      new InviteMemberUseCase(repo).execute({ brigadeId: 'b', userId: 'u', email: 'x@x.com', role: 'STAFF' }),
    ).rejects.toThrow('MIEMBRO_YA_EXISTE')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/invite-member.test.ts
```

Expected: FAIL — "Cannot find module '../../invite-member'"

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/invite-member.ts
import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface InviteMemberDto {
  brigadeId: string
  userId: string
  email: string
  role: 'STAFF' | 'CO_DIRECTOR'
}

export class InviteMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, userId, email, role }: InviteMemberDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const exists = await this.repo.existsByEmail(brigadeId, email)
    if (exists) throw new Error('MIEMBRO_YA_EXISTE')

    return this.repo.createInvite({ brigadeId, email, role, inviteToken: crypto.randomUUID() })
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/invite-member.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/invite-member.ts src/members/application/use-cases/tests/unit/invite-member.test.ts
git commit -m "feat(members): add InviteMemberUseCase with tests"
```

---

### Task 6: generate-staff-credentials use case

**Files:**

- Create: `src/members/application/use-cases/generate-staff-credentials.ts`
- Create: `src/members/application/use-cases/tests/unit/generate-staff-credentials.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/generate-staff-credentials.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GenerateStaffCredentialsUseCase } from '../../generate-staff-credentials'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: 'jperez',
    inviteToken: null,
    invitedAt: new Date(),
    acceptedAt: null,
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('GenerateStaffCredentialsUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('creates credential member with role STAFF when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(false)
    vi.mocked(repo.createWithCredentials).mockResolvedValue(makeMember())

    const result = await new GenerateStaffCredentialsUseCase(repo).execute({
      brigadeId: 'brigade-1',
      userId: 'user-1',
      email: 'staff@example.com',
      generatedUsername: 'jperez',
      plainPassword: 'secret123',
    })

    expect(result.role).toBe('STAFF')
    expect(repo.createWithCredentials).toHaveBeenCalledWith({
      brigadeId: 'brigade-1',
      email: 'staff@example.com',
      generatedUsername: 'jperez',
      plainPassword: 'secret123',
      role: 'STAFF',
    })
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId: 'b',
        userId: 'u',
        email: 'x@x.com',
        generatedUsername: 'u',
        plainPassword: 'p',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_YA_EXISTE when email already in brigade', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.existsByEmail).mockResolvedValue(true)

    await expect(
      new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId: 'b',
        userId: 'u',
        email: 'x@x.com',
        generatedUsername: 'u',
        plainPassword: 'p',
      }),
    ).rejects.toThrow('MIEMBRO_YA_EXISTE')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/generate-staff-credentials.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/generate-staff-credentials.ts
import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface GenerateStaffCredentialsDto {
  brigadeId: string
  userId: string
  email: string
  generatedUsername: string
  plainPassword: string
}

export class GenerateStaffCredentialsUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({
    brigadeId,
    userId,
    email,
    generatedUsername,
    plainPassword,
  }: GenerateStaffCredentialsDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const exists = await this.repo.existsByEmail(brigadeId, email)
    if (exists) throw new Error('MIEMBRO_YA_EXISTE')

    return this.repo.createWithCredentials({
      brigadeId,
      email,
      generatedUsername,
      plainPassword,
      role: 'STAFF',
    })
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/generate-staff-credentials.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/generate-staff-credentials.ts src/members/application/use-cases/tests/unit/generate-staff-credentials.test.ts
git commit -m "feat(members): add GenerateStaffCredentialsUseCase with tests"
```

---

### Task 7: accept-invite use case

**Files:**

- Create: `src/members/application/use-cases/accept-invite.ts`
- Create: `src/members/application/use-cases/tests/unit/accept-invite.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/accept-invite.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AcceptInviteUseCase } from '../../accept-invite'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makePending = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: null,
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    inviteToken: 'valid-token',
    invitedAt: new Date(),
    acceptedAt: null,
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('AcceptInviteUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('accepts a pending invite and returns updated member', async () => {
    const pending = makePending()
    const accepted = makePending({ profileId: 'profile-1', acceptedAt: new Date() })
    vi.mocked(repo.findByInviteToken).mockResolvedValue(pending)
    vi.mocked(repo.acceptInvite).mockResolvedValue(accepted)

    const result = await new AcceptInviteUseCase(repo).execute({
      token: 'valid-token',
      profileId: 'profile-1',
    })

    expect(result.profileId).toBe('profile-1')
    expect(result.acceptedAt).not.toBeNull()
    expect(repo.acceptInvite).toHaveBeenCalledWith('valid-token', 'profile-1')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when token does not exist', async () => {
    vi.mocked(repo.findByInviteToken).mockResolvedValue(null)

    await expect(
      new AcceptInviteUseCase(repo).execute({ token: 'bad-token', profileId: 'p' }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })

  it('throws INVITACION_YA_ACEPTADA when acceptedAt is already set', async () => {
    const already = makePending({ acceptedAt: new Date() })
    vi.mocked(repo.findByInviteToken).mockResolvedValue(already)

    await expect(
      new AcceptInviteUseCase(repo).execute({ token: 'valid-token', profileId: 'p' }),
    ).rejects.toThrow('INVITACION_YA_ACEPTADA')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/accept-invite.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/accept-invite.ts
import type { BrigadeMember } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface AcceptInviteDto {
  token: string
  profileId: string
}

export class AcceptInviteUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ token, profileId }: AcceptInviteDto): Promise<BrigadeMember> {
    const member = await this.repo.findByInviteToken(token)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')
    if (!member.isPending()) throw new Error('INVITACION_YA_ACEPTADA')
    return this.repo.acceptInvite(token, profileId)
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/accept-invite.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/accept-invite.ts src/members/application/use-cases/tests/unit/accept-invite.test.ts
git commit -m "feat(members): add AcceptInviteUseCase with tests"
```

---

### Task 8: update-member-role use case

**Files:**

- Create: `src/members/application/use-cases/update-member-role.ts`
- Create: `src/members/application/use-cases/tests/unit/update-member-role.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/update-member-role.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateMemberRoleUseCase } from '../../update-member-role'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: 'profile-2',
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    inviteToken: null,
    invitedAt: new Date(),
    acceptedAt: new Date(),
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('UpdateMemberRoleUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('updates role when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember())
    vi.mocked(repo.update).mockResolvedValue(makeMember({ role: 'CO_DIRECTOR' }))

    const result = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'user-1',
      role: 'CO_DIRECTOR',
    })

    expect(result.role).toBe('CO_DIRECTOR')
    expect(repo.update).toHaveBeenCalledWith('member-1', {
      role: 'CO_DIRECTOR',
      retainAccessAfterClose: undefined,
    })
  })

  it('updates retainAccessAfterClose without changing role', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('CO_DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember())
    vi.mocked(repo.update).mockResolvedValue(makeMember({ retainAccessAfterClose: true }))

    const result = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'user-1',
      retainAccessAfterClose: true,
    })

    expect(result.retainAccessAfterClose).toBe(true)
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new UpdateMemberRoleUseCase(repo).execute({
        brigadeId: 'b',
        memberId: 'm',
        userId: 'u',
        role: 'CO_DIRECTOR',
      }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when member does not exist', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(null)

    await expect(
      new UpdateMemberRoleUseCase(repo).execute({
        brigadeId: 'b',
        memberId: 'm',
        userId: 'u',
        role: 'CO_DIRECTOR',
      }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/update-member-role.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/update-member-role.ts
import type { BrigadeMember, BrigadeRole } from '../../domain/entities/BrigadeMember'
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface UpdateMemberRoleDto {
  brigadeId: string
  memberId: string
  userId: string
  role?: BrigadeRole
  retainAccessAfterClose?: boolean
}

export class UpdateMemberRoleUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({
    brigadeId,
    memberId,
    userId,
    role,
    retainAccessAfterClose,
  }: UpdateMemberRoleDto): Promise<BrigadeMember> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const member = await this.repo.findById(memberId, brigadeId)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')

    return this.repo.update(memberId, { role, retainAccessAfterClose })
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/update-member-role.test.ts
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/update-member-role.ts src/members/application/use-cases/tests/unit/update-member-role.test.ts
git commit -m "feat(members): add UpdateMemberRoleUseCase with tests"
```

---

### Task 9: remove-member use case

**Files:**

- Create: `src/members/application/use-cases/remove-member.ts`
- Create: `src/members/application/use-cases/tests/unit/remove-member.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/members/application/use-cases/tests/unit/remove-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RemoveMemberUseCase } from '../../remove-member'
import type { IMemberRepository } from '../../../../domain/repositories/IMemberRepository'
import { BrigadeMember } from '../../../../domain/entities/BrigadeMember'

const makeMember = (overrides = {}) =>
  new BrigadeMember({
    id: 'member-1',
    brigadeId: 'brigade-1',
    profileId: 'profile-2',
    email: 'staff@example.com',
    role: 'STAFF',
    generatedUsername: null,
    inviteToken: null,
    invitedAt: new Date(),
    acceptedAt: new Date(),
    retainAccessAfterClose: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

const makeRepo = (): IMemberRepository => ({
  findAllByBrigade: vi.fn(),
  findById: vi.fn(),
  findByInviteToken: vi.fn(),
  getMemberRole: vi.fn(),
  existsByEmail: vi.fn(),
  createInvite: vi.fn(),
  createWithCredentials: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  acceptInvite: vi.fn(),
})

describe('RemoveMemberUseCase', () => {
  let repo: IMemberRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('removes a member when caller is DIRECTOR', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: 'profile-2' }))
    vi.mocked(repo.delete).mockResolvedValue(undefined)

    await new RemoveMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'profile-1',
    })

    expect(repo.delete).toHaveBeenCalledWith('member-1')
  })

  it('can remove a pending invite (profileId null)', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: null }))
    vi.mocked(repo.delete).mockResolvedValue(undefined)

    await new RemoveMemberUseCase(repo).execute({
      brigadeId: 'brigade-1',
      memberId: 'member-1',
      userId: 'profile-1',
    })

    expect(repo.delete).toHaveBeenCalledWith('member-1')
  })

  it('throws SIN_PERMISO when caller is STAFF', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('STAFF')

    await expect(
      new RemoveMemberUseCase(repo).execute({ brigadeId: 'b', memberId: 'm', userId: 'u' }),
    ).rejects.toThrow('SIN_PERMISO')
  })

  it('throws MIEMBRO_NO_ENCONTRADO when member does not exist', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(null)

    await expect(
      new RemoveMemberUseCase(repo).execute({ brigadeId: 'b', memberId: 'm', userId: 'u' }),
    ).rejects.toThrow('MIEMBRO_NO_ENCONTRADO')
  })

  it('throws NO_PUEDE_ELIMINARSE_A_SI_MISMO when removing self', async () => {
    vi.mocked(repo.getMemberRole).mockResolvedValue('DIRECTOR')
    vi.mocked(repo.findById).mockResolvedValue(makeMember({ profileId: 'profile-1' }))

    await expect(
      new RemoveMemberUseCase(repo).execute({
        brigadeId: 'brigade-1',
        memberId: 'member-1',
        userId: 'profile-1',
      }),
    ).rejects.toThrow('NO_PUEDE_ELIMINARSE_A_SI_MISMO')
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
bun run test src/members/application/use-cases/tests/unit/remove-member.test.ts
```

- [ ] **Step 3: Implement**

```typescript
// src/members/application/use-cases/remove-member.ts
import type { IMemberRepository } from '../../domain/repositories/IMemberRepository'

interface RemoveMemberDto {
  brigadeId: string
  memberId: string
  userId: string
}

export class RemoveMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  async execute({ brigadeId, memberId, userId }: RemoveMemberDto): Promise<void> {
    const callerRole = await this.repo.getMemberRole(brigadeId, userId)
    if (callerRole !== 'DIRECTOR' && callerRole !== 'CO_DIRECTOR') throw new Error('SIN_PERMISO')

    const member = await this.repo.findById(memberId, brigadeId)
    if (!member) throw new Error('MIEMBRO_NO_ENCONTRADO')

    if (member.profileId === userId) throw new Error('NO_PUEDE_ELIMINARSE_A_SI_MISMO')

    await this.repo.delete(memberId)
  }
}
```

- [ ] **Step 4: Run — expect pass**

```bash
bun run test src/members/application/use-cases/tests/unit/remove-member.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/members/application/use-cases/remove-member.ts src/members/application/use-cases/tests/unit/remove-member.test.ts
git commit -m "feat(members): add RemoveMemberUseCase with tests"
```

---

### Task 10: Run full test suite

- [ ] **Step 1: Run all members tests together**

```bash
bun run test src/members/
```

Expected: PASS — all tests green, no type errors

- [ ] **Step 2: Confirm type safety**

```bash
bun run tsc --noEmit
```

Expected: no errors

---

### Task 11: PrismaMemberRepository

**Files:**

- Create: `src/members/infrastructure/prisma-member-repository.ts`

No unit test (integration-level concern). Type-check is the verification.

- [ ] **Step 1: Create the repository**

```typescript
// src/members/infrastructure/prisma-member-repository.ts
import bcrypt from 'bcryptjs'
import type { PrismaClient } from '@/shared/prisma/generated/client'
import { AppRole, BrigadeRole as PrismaBrigadeRole } from '@/shared/prisma/generated/enums'
import { BrigadeMember } from '../domain/entities/BrigadeMember'
import type { BrigadeMemberProps, BrigadeRole } from '../domain/entities/BrigadeMember'
import type {
  IMemberRepository,
  CreateInviteMemberData,
  CreateCredentialsMemberData,
  UpdateMemberData,
} from '../domain/repositories/IMemberRepository'

type PrismaMemberRow = {
  id: string
  brigadeId: string
  profileId: string | null
  email: string
  role: PrismaBrigadeRole
  generatedUsername: string | null
  generatedPasswordHash: string | null
  inviteToken: string | null
  invitedAt: Date
  acceptedAt: Date | null
  retainAccessAfterClose: boolean
  createdAt: Date
  updatedAt: Date
}

function toDomainProps(row: PrismaMemberRow): BrigadeMemberProps {
  return {
    id: row.id,
    brigadeId: row.brigadeId,
    profileId: row.profileId,
    email: row.email,
    role: row.role as BrigadeRole,
    generatedUsername: row.generatedUsername,
    inviteToken: row.inviteToken,
    invitedAt: row.invitedAt,
    acceptedAt: row.acceptedAt,
    retainAccessAfterClose: row.retainAccessAfterClose,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toDomain(row: PrismaMemberRow): BrigadeMember {
  return new BrigadeMember(toDomainProps(row))
}

export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAllByBrigade(brigadeId: string, userId: string): Promise<BrigadeMember[]> {
    const rows = await this.prisma.brigadeMember.findMany({
      where: {
        brigadeId,
        brigade: { members: { some: { profileId: userId } } },
      },
      orderBy: { invitedAt: 'asc' },
    })
    return rows.map(toDomain)
  }

  async findById(id: string, brigadeId: string): Promise<BrigadeMember | null> {
    const row = await this.prisma.brigadeMember.findFirst({ where: { id, brigadeId } })
    return row ? toDomain(row) : null
  }

  async findByInviteToken(token: string): Promise<BrigadeMember | null> {
    const row = await this.prisma.brigadeMember.findUnique({ where: { inviteToken: token } })
    return row ? toDomain(row) : null
  }

  async getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null> {
    const [profile, member] = await Promise.all([
      this.prisma.profile.findUnique({ where: { id: userId }, select: { role: true } }),
      this.prisma.brigadeMember.findFirst({
        where: { brigadeId, profileId: userId },
        select: { role: true },
      }),
    ])
    if (profile?.role === AppRole.PLATFORM_ADMIN) return 'DIRECTOR'
    return (member?.role as BrigadeRole) ?? null
  }

  async existsByEmail(brigadeId: string, email: string): Promise<boolean> {
    const count = await this.prisma.brigadeMember.count({ where: { brigadeId, email } })
    return count > 0
  }

  async createInvite(data: CreateInviteMemberData): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.create({
      data: {
        brigadeId: data.brigadeId,
        email: data.email,
        role: data.role as PrismaBrigadeRole,
        inviteToken: data.inviteToken,
      },
    })
    return toDomain(row)
  }

  async createWithCredentials(data: CreateCredentialsMemberData): Promise<BrigadeMember> {
    const generatedPasswordHash = await bcrypt.hash(data.plainPassword, 12)
    const row = await this.prisma.brigadeMember.create({
      data: {
        brigadeId: data.brigadeId,
        email: data.email,
        role: PrismaBrigadeRole.STAFF,
        generatedUsername: data.generatedUsername,
        generatedPasswordHash,
      },
    })
    return toDomain(row)
  }

  async update(id: string, data: UpdateMemberData): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role as PrismaBrigadeRole }),
        ...(data.retainAccessAfterClose !== undefined && {
          retainAccessAfterClose: data.retainAccessAfterClose,
        }),
      },
    })
    return toDomain(row)
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brigadeMember.delete({ where: { id } })
  }

  async acceptInvite(token: string, profileId: string): Promise<BrigadeMember> {
    const row = await this.prisma.brigadeMember.update({
      where: { inviteToken: token },
      data: { profileId, acceptedAt: new Date() },
    })
    return toDomain(row)
  }
}
```

- [ ] **Step 2: Verify**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/members/infrastructure/prisma-member-repository.ts
git commit -m "feat(members): add PrismaMemberRepository"
```

---

### Task 12: GET + POST /members route handler

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/members/route.ts`

- [ ] **Step 1: Create route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/members/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { ListMembersUseCase } from '@/src/members/application/use-cases/list-members'
import { InviteMemberUseCase } from '@/src/members/application/use-cases/invite-member'
import { GenerateStaffCredentialsUseCase } from '@/src/members/application/use-cases/generate-staff-credentials'
import type { BrigadeMember } from '@/src/members/domain/entities/BrigadeMember'

const inviteSchema = z.object({
  modo: z.literal('invitacion'),
  email: z.string().email('El correo no es válido.'),
  rol: z.enum(['STAFF', 'CO_DIRECTOR']).optional().default('STAFF'),
})

const credencialesSchema = z.object({
  modo: z.literal('credenciales'),
  email: z.string().email('El correo no es válido.'),
  usuario: z.string().min(3, 'El usuario debe tener al menos 3 caracteres.'),
  contrasena: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.'),
})

const postSchema = z.discriminatedUnion('modo', [inviteSchema, credencialesSchema])

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number, fields?: { field: string; message: string }[]) {
  return Response.json(
    { success: false, data: null, errors: { code, message, ...(fields ? { fields } : {}) } },
    { status },
  )
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  MIEMBRO_YA_EXISTE: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  MIEMBRO_YA_EXISTE: 'Ya existe un miembro con ese correo en esta brigada.',
}

function mapMember(m: BrigadeMember) {
  return {
    id: m.id,
    email: m.email,
    rol: m.role,
    aceptadoEn: m.acceptedAt,
    retenerAccesoAlCerrar: m.retainAccessAfterClose,
    modoCredenciales: m.hasGeneratedCredentials(),
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaMemberRepository(prisma)
    const members = await new ListMembersUseCase(repo).execute({ brigadeId, userId: user.id })
    return ok(members.map(mapMember))
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ brigadeId: string }> }) {
  const { brigadeId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => ({
      field: String(i.path[0] ?? 'unknown'),
      message: i.message,
    }))
    return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400, fields)
  }

  try {
    const repo = new PrismaMemberRepository(prisma)
    let member: BrigadeMember

    if (parsed.data.modo === 'invitacion') {
      member = await new InviteMemberUseCase(repo).execute({
        brigadeId,
        userId: user.id,
        email: parsed.data.email,
        role: parsed.data.rol,
      })
    } else {
      member = await new GenerateStaffCredentialsUseCase(repo).execute({
        brigadeId,
        userId: user.id,
        email: parsed.data.email,
        generatedUsername: parsed.data.usuario,
        plainPassword: parsed.data.contrasena,
      })
    }

    return ok(
      {
        id: member.id,
        email: member.email,
        rol: member.role,
        modo: parsed.data.modo,
        tokenInvitacion: member.inviteToken,
      },
      201,
    )
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Verify**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/members/route.ts"
git commit -m "feat(members): add GET and POST /members route handler"
```

---

### Task 13: PATCH + DELETE /members/[memberId] route handler

**Files:**

- Create: `app/api/v1/brigades/[brigadeId]/members/[memberId]/route.ts`

- [ ] **Step 1: Create route handler**

```typescript
// app/api/v1/brigades/[brigadeId]/members/[memberId]/route.ts
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { UpdateMemberRoleUseCase } from '@/src/members/application/use-cases/update-member-role'
import { RemoveMemberUseCase } from '@/src/members/application/use-cases/remove-member'

const patchSchema = z.object({
  rol: z.enum(['STAFF', 'CO_DIRECTOR', 'DIRECTOR']).optional(),
  retenerAccesoAlCerrar: z.boolean().optional(),
})

function ok<T>(data: T, status = 200) {
  return Response.json({ success: true, data, errors: null }, { status })
}

function err(code: string, message: string, status: number) {
  return Response.json({ success: false, data: null, errors: { code, message } }, { status })
}

const ERROR_STATUS: Record<string, number> = {
  SIN_PERMISO: 403,
  MIEMBRO_NO_ENCONTRADO: 404,
  NO_PUEDE_ELIMINARSE_A_SI_MISMO: 409,
}

const ERROR_MESSAGES: Record<string, string> = {
  SIN_PERMISO: 'No tienes permiso para realizar esta acción.',
  MIEMBRO_NO_ENCONTRADO: 'El miembro solicitado no existe.',
  NO_PUEDE_ELIMINARSE_A_SI_MISMO: 'No puedes eliminarte a ti mismo de la brigada.',
}

type RouteParams = { params: Promise<{ brigadeId: string; memberId: string }> }

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { brigadeId, memberId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return err('VALIDACION_FALLIDA', 'Los datos enviados no son válidos.', 400)

  try {
    const repo = new PrismaMemberRepository(prisma)
    const member = await new UpdateMemberRoleUseCase(repo).execute({
      brigadeId,
      memberId,
      userId: user.id,
      role: parsed.data.rol,
      retainAccessAfterClose: parsed.data.retenerAccesoAlCerrar,
    })
    return ok({
      id: member.id,
      email: member.email,
      rol: member.role,
      retenerAccesoAlCerrar: member.retainAccessAfterClose,
    })
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { brigadeId, memberId } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return err('SESION_REQUERIDA', 'La sesión ha expirado. Por favor inicia sesión nuevamente.', 401)

  try {
    const repo = new PrismaMemberRepository(prisma)
    await new RemoveMemberUseCase(repo).execute({ brigadeId, memberId, userId: user.id })
    return ok(null)
  } catch (e) {
    const code = e instanceof Error ? e.message : 'ERROR_INTERNO'
    const status = ERROR_STATUS[code] ?? 500
    const message = ERROR_MESSAGES[code] ?? 'Ocurrió un error interno. Por favor intenta de nuevo.'
    return err(code, message, status)
  }
}
```

- [ ] **Step 2: Verify**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/v1/brigades/[brigadeId]/members/[memberId]/route.ts"
git commit -m "feat(members): add PATCH and DELETE /members/[memberId] route handler"
```

---

### Task 14: Wire invite page to real data + server action

The invite page at `app/(auth)/invite/[token]/page.tsx` currently uses hardcoded mock data. Replace it with real DB lookup and a server action so an already-logged-in user can accept the invite immediately.

**Files:**

- Modify: `app/(auth)/invite/[token]/page.tsx`

- [ ] **Step 1: Replace page with wired version**

The page must:

1. Look up the real invite from DB using the token
2. If user is already logged in, accept the invite immediately and redirect
3. If user is not logged in, show the existing UI so they can log in / register

```typescript
// app/(auth)/invite/[token]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Lock, User, Stethoscope } from 'lucide-react'
import { MobileShell } from '@/components/layout/MobileShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createSupabaseServerClient } from '@/shared/supabase/server'
import { prisma } from '@/shared/prisma/client'
import { PrismaMemberRepository } from '@/src/members/infrastructure/prisma-member-repository'
import { AcceptInviteUseCase } from '@/src/members/application/use-cases/accept-invite'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const repo = new PrismaMemberRepository(prisma)
  const member = await repo.findByInviteToken(token)

  if (!member || !member.isPending()) {
    return (
      <MobileShell>
        <PageHeader title="Invitación" backHref="/" />
        <main className="flex-1 px-6 pt-10 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <Stethoscope className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-xl font-bold">Invitación inválida</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Este enlace expiró o ya fue usado.</p>
          <Link href="/login" className="mt-8 block">
            <Button size="lg" variant="soft" className="w-full">
              Ir al inicio de sesión
            </Button>
          </Link>
        </main>
      </MobileShell>
    )
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await new AcceptInviteUseCase(repo).execute({ token, profileId: user.id })
    redirect(`/brigades/${member.brigadeId}`)
  }

  const roleLabel = member.role === 'CO_DIRECTOR' ? 'Co-Director' : 'Personal'

  return (
    <MobileShell>
      <PageHeader title="Unirse a brigada" backHref="/" />
      <main className="flex-1 px-6 pt-6 pb-10">
        <Card className="mb-8 p-5">
          <div className="flex items-center gap-3">
            <div className="bg-brand-gradient flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Invitado a una brigada</p>
              <h2 className="text-base font-semibold">{member.email}</h2>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">Rol asignado:</span>
            <Badge variant="soft">{roleLabel}</Badge>
          </div>
        </Card>

        <div className="mb-8 space-y-2">
          <h3 className="text-lg font-bold">Inicia sesión para continuar</h3>
          <p className="text-sm text-[var(--muted)]">
            Inicia sesión con tu cuenta para aceptar la invitación automáticamente.
          </p>
        </div>

        <Link href={`/login?redirect=/invite/${token}`}>
          <Button size="lg" className="w-full">
            Ir al inicio de sesión
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        <p className="mt-8 text-center text-xs text-[var(--muted)]">
          ¿No tienes cuenta?{' '}
          <Link href={`/register?redirect=/invite/${token}`} className="font-medium text-[var(--accent)]">
            Regístrate
          </Link>
        </p>
      </main>
    </MobileShell>
  )
}
```

- [ ] **Step 2: Verify types**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/invite/[token]/page.tsx"
git commit -m "feat(members): wire invite page to real DB + auto-accept for logged-in users"
```

---

### Task 15: Final verification

- [ ] **Step 1: Run all members tests**

```bash
bun run test src/members/
```

Expected: all tests pass

- [ ] **Step 2: Run full test suite — check for regressions**

```bash
bun run test
```

Expected: all tests pass

- [ ] **Step 3: Type-check entire project**

```bash
bun run tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Lint**

```bash
bun run lint
```

Expected: no errors
