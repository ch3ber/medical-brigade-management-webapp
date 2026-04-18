# 03 — Database Schema

All tables live in the `public` schema in PostgreSQL (Supabase). Row-Level Security (RLS) is enabled on every table. The `auth.users` table is managed by Supabase Auth and is never modified directly.

---

## Entity relationship overview

```
auth.users (Supabase managed)
    │
    └── profiles (1:1)
            │
            ├── brigades (created_by → profiles.id)
            │       │
            │       ├── areas (1:N, scoped to brigade)
            │       │
            │       ├── brigade_members (1:N, links profiles to brigades)
            │       │
            │       └── patients (1:N, scoped to brigade)
            │               │
            │               └── turnos (1:N, one per patient per area visit)
            │                       │
            │                       └── area (FK → areas)
            │
            └── brigade_members (profile_id → profiles.id)
```

---

## Enums

```prisma
enum AppRole {
  PLATFORM_ADMIN     // internal, full access across all brigades
  BRIGADE_DIRECTOR   // default for any registered user
}

enum BrigadeRole {
  DIRECTOR     // created the brigade or promoted by another director
  CO_DIRECTOR  // invited director with full read access and limited write
  STAFF        // invited member, can register patients and operate queues
}

enum BrigadeStatus {
  DRAFT    // being configured, no patient intake yet
  ACTIVE   // opened manually by the director, intake and queues are live
  CLOSED   // closed manually by the director, fully read-only
}

enum TurnoStatus {
  WAITING    // in the area queue, not yet called
  CALLED     // currently being served (only one per area at a time)
  SERVED     // attended and completed
  MOVED      // was not present when called, moved to the tail of the queue
  REMOVED    // permanently removed from the queue by staff
}
```

---

## Table definitions

### `profiles`
Extends `auth.users` with application-specific fields. Created automatically via a Supabase database trigger on `auth.users` insert.

```prisma
model Profile {
  id        String   @id           // matches auth.users.id exactly
  fullName  String
  avatarUrl String?
  role      AppRole  @default(BRIGADE_DIRECTOR)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  brigades       Brigade[]       @relation("BrigadeCreator")
  brigadeMembers BrigadeMember[]
}
```

---

### `brigades`
A single-day medical event. Fully isolated — all data under a brigade stays within that brigade.

```prisma
model Brigade {
  id          String        @id @default(uuid())
  name        String
  description String?
  location    String
  date        DateTime      // the calendar date of the event (date only, no time)
  status      BrigadeStatus @default(DRAFT)
  openedAt    DateTime?     // set when director transitions DRAFT → ACTIVE
  closedAt    DateTime?     // set when director transitions ACTIVE → CLOSED
  createdBy   String        // FK → profiles.id
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  creator  Profile         @relation("BrigadeCreator", fields: [createdBy], references: [id])
  areas    Area[]
  members  BrigadeMember[]
  patients Patient[]
}
```

**Clone behavior:**
- Cloning a brigade creates a new `Brigade` row with `status = DRAFT` and copies all `Area` rows (name, color, prefix, patientLimit) with fresh UUIDs. No patients, turnos, or members are copied.
- Cloning individual areas copies only the selected `Area` rows into the target brigade.
- Counters (`globalOrder`, `areaOrder`) always start at 1 in the new brigade regardless of source.

---

### `areas`
A medical station within a brigade. Configured by the director. Can be cloned from previous brigades.

```prisma
model Area {
  id           String   @id @default(uuid())
  brigadeId    String
  name         String
  prefix       String   // short code for turno label, e.g. "D" → turno "D-12". Max 4 chars.
  color        String   // hex color, e.g. "#4F86C6". Used for UI badges and queue display.
  patientLimit Int?     // optional cap on patients for this area. Null = unlimited.
  order        Int      @default(0) // display order in director overview
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  brigade Brigade @relation(fields: [brigadeId], references: [id], onDelete: Cascade)
  turnos  Turno[]
}
```

**Turno label format:** `{prefix}-{areaOrder}` — e.g. prefix `D` + areaOrder `12` → `D-12`. Formatting is handled in the application layer (`lib/utils/turno.ts`), not stored in the database.

**Patient limit:** When `patientLimit` is set and the area has reached that number of non-`REMOVED` turnos, the API rejects new turno creation for that area and returns a `AREA_LIMIT_REACHED` error.

---

### `brigade_members`
Links a user profile (or a pending invite) to a brigade with a specific role. A user can be a member of multiple brigades with different roles in each.

```prisma
model BrigadeMember {
  id           String      @id @default(uuid())
  brigadeId    String
  profileId    String?     // null until the invite is accepted
  email        String
  role         BrigadeRole @default(STAFF)
  // Credentials for non-registered staff (generated by director)
  // Password is hashed. If null, the member uses their own Supabase Auth session.
  generatedUsername String? @unique
  generatedPasswordHash String?
  // Invite flow for existing registered users
  inviteToken  String?     @unique
  invitedAt    DateTime    @default(now())
  acceptedAt   DateTime?   // null = invite pending
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  brigade Brigade  @relation(fields: [brigadeId], references: [id], onDelete: Cascade)
  profile Profile? @relation(fields: [profileId], references: [id])

  @@unique([brigadeId, profileId])
  @@unique([brigadeId, email])
}
```

**Two paths to join a brigade as staff:**
1. **Generated credentials** — director creates a username + password from the director panel. `profileId` is linked on first login. `inviteToken` is null.
2. **Invite link** — director sends an invite to an existing user's email. `inviteToken` is generated, emailed, and consumed on acceptance. `generatedUsername` is null.

**Access to closed brigades:** Members retain their `brigade_members` row after a brigade closes. RLS policies check membership for read access regardless of brigade status.

---

### `patients`
A person registered during an active brigade. Scoped entirely to one brigade.

```prisma
model Patient {
  id            String   @id @default(uuid())
  brigadeId     String
  fullName      String
  age           Int
  gender        String   // "male" | "female" | "other" — stored as string for flexibility
  phone         String
  address       String
  wantsChurchVisit Boolean @default(false)
  globalOrder   Int      // arrival order within the brigade. Starts at 1, never changes.
  registeredBy  String   // FK → profiles.id (the staff member who registered them)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  brigade  Brigade @relation(fields: [brigadeId], references: [id], onDelete: Cascade)
  turnos   Turno[]

  @@unique([brigadeId, globalOrder])
}
```

**`globalOrder`** is computed on insert as `MAX(global_order) + 1` within the brigade, inside a transaction with an advisory lock. It never changes after creation.

---

### `turnos`
One record per patient per area visit. This table is the queue — there is no separate queue table.

```prisma
model Turno {
  id          String      @id @default(uuid())
  brigadeId   String      // denormalized from patient for simpler RLS policies
  areaId      String
  patientId   String
  areaOrder   Int         // position in this area's queue. Starts at 1 per brigade+area.
  status      TurnoStatus @default(WAITING)
  calledAt    DateTime?   // set when status → CALLED
  servedAt    DateTime?   // set when status → SERVED
  movedCount  Int         @default(0) // number of times this turno was moved to the tail
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  area    Area    @relation(fields: [areaId], references: [id])
  patient Patient @relation(fields: [patientId], references: [id])

  @@unique([areaId, areaOrder])
}
```

**`areaOrder`** is computed on insert as `MAX(area_order) + 1` within the area+brigade combination, inside a transaction with an advisory lock. It never changes — even when a turno is moved to the tail, `areaOrder` stays the same and the queue is re-sorted by `(status = WAITING, areaOrder ASC)` filtered to exclude non-waiting turnos.

**Only one `CALLED` turno per area at any time.** Enforced at the application layer in the "next turno" API route, not as a DB constraint.

**`movedCount`** tracks how many times a patient was not present when called. Useful for the director overview to identify no-show patterns.

---

## Indexes

```sql
-- Queue lookup: fetch WAITING turnos for an area in order
CREATE INDEX idx_turnos_area_queue
  ON turnos (area_id, status, area_order)
  WHERE status = 'WAITING';

-- Current turno: find the single CALLED turno for an area
CREATE INDEX idx_turnos_area_called
  ON turnos (area_id, status)
  WHERE status = 'CALLED';

-- Director overview: brigade-wide turno counts by status
CREATE INDEX idx_turnos_brigade_status
  ON turnos (brigade_id, status);

-- Patient lookup within a brigade
CREATE INDEX idx_patients_brigade_order
  ON patients (brigade_id, global_order);

-- Member lookup: find a user's brigades
CREATE INDEX idx_members_profile
  ON brigade_members (profile_id, brigade_id);
```

---

## Concurrent insert safety

Both `globalOrder` (patients) and `areaOrder` (turnos) must be unique and sequential within their scope. Two staff members registering patients simultaneously must not receive duplicate numbers.

The insert runs inside a Prisma transaction using a PostgreSQL advisory lock scoped to the brigade or area:

```sql
-- For globalOrder: lock on the brigade
SELECT pg_advisory_xact_lock(hashtext('patient:' || brigade_id));

-- For areaOrder: lock on the brigade + area combination
SELECT pg_advisory_xact_lock(hashtext('turno:' || brigade_id || ':' || area_id));
```

The lock is released automatically when the transaction commits or rolls back.

---

## RLS policies (summary)

Full migration SQL lives in `supabase/migrations/`. This table summarizes the intent.

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Own row only | Via DB trigger on auth signup | Own row only | No |
| `brigades` | Member of brigade OR platform admin | Any authenticated user | Director / co-director of brigade | Director only |
| `areas` | Brigade member | Director / co-director | Director / co-director | Director only (if no turnos) |
| `brigade_members` | Brigade member | Director of brigade | Director of brigade | Director of brigade |
| `patients` | Brigade member | Brigade staff, co-director, or director | Brigade staff, co-director, or director | Director only |
| `turnos` | Brigade member | Brigade staff, co-director, or director | Brigade staff, co-director, or director | Director only |

**Closed brigades:** Members can still SELECT all rows. No INSERT, UPDATE, or DELETE is allowed on any table once `brigade.status = 'CLOSED'`. This is enforced in the API layer, not via RLS, to keep policies simple.

---

## Database triggers

### Auto-create profile on signup
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
