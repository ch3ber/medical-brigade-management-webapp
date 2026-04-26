# Brigades API — Full Stack Design

**Date:** 2026-04-19
**Scope:** `brigades` domain slice — domain layer, application layer, infrastructure (Prisma repo + route handlers)
**Approach:** Strict Clean Architecture (A)

---

## 1. Domain Layer

**Location:** `src/brigades/domain/`

### Entity: `Brigade.ts`

Fields:

- `id: string` (UUID)
- `name: string`
- `description: string | null`
- `location: string`
- `date: Date`
- `status: BrigadeStatus`
- `openedAt: Date | null`
- `closedAt: Date | null`
- `createdBy: string` (profiles.id)
- `createdAt: Date`

Business methods:

- `canOpen(): boolean` — returns `status === 'DRAFT'`
- `canClose(): boolean` — returns `status === 'ACTIVE'`
- `isEditable(): boolean` — returns `status !== 'CLOSED'`

### Value Object: `BrigadeStatus.ts`

TypeScript `const` enum with values `DRAFT | ACTIVE | CLOSED`.
Static `assertTransition(from, to)` — throws `INVALID_TRANSITION` if the transition is not allowed.
Valid transitions: `DRAFT → ACTIVE`, `ACTIVE → CLOSED`.

### Repository Interface: `IBrigadeRepository.ts`

```typescript
interface IBrigadeRepository {
  findById(id: string, userId: string): Promise<Brigade | null>
  save(brigade: Brigade): Promise<Brigade>
  update(id: string, data: Partial<Brigade>): Promise<Brigade>
}
```

`findById` returns `null` if brigade does not exist or `userId` is not a member.

---

## 2. Application Layer

**Location:** `src/brigades/application/use-cases/`

Each use case is a class. Constructor receives `IBrigadeRepository`. Single `execute(dto)` method.
Throws domain error strings matching the error codes in `docs/architecture/07-api-routes.md`.

| File                | Input DTO                                                                | Notes                                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get-brigade.ts`    | `{ brigadeId, userId }`                                                  | Returns Brigade or throws `BRIGADA_NO_ENCONTRADA`                                                                                                                      |
| `update-brigade.ts` | `{ brigadeId, userId, data: { name?, description?, location?, date? } }` | Checks `isEditable()`, checks director/co-director role, throws `SIN_PERMISO` or `BRIGADA_CERRADA`                                                                     |
| `open-brigade.ts`   | `{ brigadeId, userId }`                                                  | Checks `canOpen()`, checks director/co-director role, sets `openedAt = now()`, transitions status                                                                      |
| `close-brigade.ts`  | `{ brigadeId, userId }`                                                  | Checks `canClose()`, checks director/co-director role, sets `closedAt = now()`, transitions status                                                                     |
| `clone-brigade.ts`  | `{ brigadeId, userId, name: string, date: string }`                      | Checks director/co-director role, creates new `DRAFT` brigade — areas copied separately via `IAreaRepository` (out of scope here; use case accepts optional area list) |

Role verification: use case calls `IBrigadeRepository.getMemberRole(brigadeId, userId)` — added to interface.
Updated interface:

```typescript
interface IBrigadeRepository {
  findById(id: string, userId: string): Promise<Brigade | null>
  getMemberRole(brigadeId: string, userId: string): Promise<BrigadeRole | null>
  save(brigade: Brigade): Promise<Brigade>
  update(id: string, data: Partial<Brigade>): Promise<Brigade>
}
```

`BrigadeRole` values: `DIRECTOR | CO_DIRECTOR | STAFF` (imported from Prisma generated enums).

---

## 3. Infrastructure Layer

### Prisma Repository

**Location:** `src/brigades/infrastructure/prisma-brigade-repository.ts`

Implements `IBrigadeRepository`. Receives `PrismaClient` in constructor.

- `findById`: Prisma `brigade.findUnique` with `include: { members: true }`. Returns `null` if no membership row for `userId`.
- `getMemberRole`: Prisma `brigadeMember.findFirst` where `brigadeId + profileId = userId`. Returns `role` or `null`.
- `save`: Prisma `brigade.create`. Returns mapped `Brigade` entity.
- `update`: Prisma `brigade.update`. Returns mapped `Brigade` entity.

### Route Handlers

All routes follow this pattern:

1. `createSupabaseServerClient()` → `supabase.auth.getUser()` → 401 `SESION_REQUERIDA` if no user
2. Zod parse body (POST/PATCH only) → 400 `VALIDACION_FALLIDA` with `fields[]` on failure
3. Instantiate `new PrismaBrigadeRepository(prisma)`
4. Instantiate use case, call `execute(dto)`
5. Catch domain error strings → map to HTTP status + error envelope
6. Return `NextResponse.json({ success, data, errors })`

#### Files

| Route file                                       | Methods    | Use case                                    |
| ------------------------------------------------ | ---------- | ------------------------------------------- |
| `app/api/v1/brigades/[brigadeId]/route.ts`       | GET, PATCH | `GetBrigadeUseCase`, `UpdateBrigadeUseCase` |
| `app/api/v1/brigades/[brigadeId]/open/route.ts`  | POST       | `OpenBrigadeUseCase`                        |
| `app/api/v1/brigades/[brigadeId]/close/route.ts` | POST       | `CloseBrigadeUseCase`                       |
| `app/api/v1/brigades/[brigadeId]/clone/route.ts` | POST       | `CloneBrigadeUseCase`                       |

#### Zod schemas

- `PATCH /[brigadeId]`: `{ name?, description?, location?, date? }` — all optional strings, `date` must be valid ISO date
- `POST /clone`: `{ nombre: string, fecha: string }` — both required

#### Error → HTTP mapping

| Domain error            | HTTP | Code                    |
| ----------------------- | ---- | ----------------------- |
| `BRIGADA_NO_ENCONTRADA` | 404  | `BRIGADA_NO_ENCONTRADA` |
| `SIN_PERMISO`           | 403  | `SIN_PERMISO`           |
| `BRIGADA_CERRADA`       | 409  | `BRIGADA_CERRADA`       |
| `BRIGADA_NO_ACTIVA`     | 409  | `BRIGADA_NO_ACTIVA`     |
| unexpected              | 500  | `ERROR_INTERNO`         |

---

## 4. Out of Scope

- Areas, patients, turnos, members endpoints (next iteration)
- `GET /api/v1/brigades` (list) — served server-side from dashboard pages, not via this API
- Clone copies areas — area repository not available yet; `CloneBrigadeUseCase` creates brigade only, no areas in v1 of this slice

---

## 5. File Checklist

```
src/brigades/domain/entities/Brigade.ts
src/brigades/domain/value-objects/BrigadeStatus.ts
src/brigades/domain/repositories/IBrigadeRepository.ts
src/brigades/application/use-cases/get-brigade.ts
src/brigades/application/use-cases/update-brigade.ts
src/brigades/application/use-cases/open-brigade.ts
src/brigades/application/use-cases/close-brigade.ts
src/brigades/application/use-cases/clone-brigade.ts
src/brigades/infrastructure/prisma-brigade-repository.ts
app/api/v1/brigades/[brigadeId]/route.ts
app/api/v1/brigades/[brigadeId]/open/route.ts
app/api/v1/brigades/[brigadeId]/close/route.ts
app/api/v1/brigades/[brigadeId]/clone/route.ts
```
