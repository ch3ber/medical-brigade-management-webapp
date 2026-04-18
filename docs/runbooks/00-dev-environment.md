# 00 — Dev Environment

Setup and switching between local Supabase and cloud.

---

## Local dev stack

| Service      | URL                                                     | Notes                       |
| ------------ | ------------------------------------------------------- | --------------------------- |
| Next.js      | http://localhost:3000                                   | `bun run dev`               |
| Supabase API | http://127.0.0.1:54321                                  | PostgREST + Auth + Realtime |
| Postgres     | postgresql://postgres:postgres@127.0.0.1:54322/postgres | Direct, no PgBouncer        |
| Studio       | http://127.0.0.1:54323                                  | DB browser                  |
| Mailpit      | http://127.0.0.1:54324                                  | Auth email trap             |

---

## First-time setup

```bash
# 1. Install deps
bun install

# 2. Start local Supabase (pulls Docker images on first run — takes ~2 min)
bunx supabase start

# 3. Copy local credentials into .env.local
#    Run `bunx supabase status` to see all values
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<publishable key from supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<secret key from supabase status>"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EOF

# 4. Generate Prisma client
bun run db:generate

# 5. Run dev server
bun run dev
```

---

## Daily workflow

```bash
bunx supabase start   # start local stack (fast — images cached)
bun run dev           # Next.js dev server
# ... work ...
bunx supabase stop    # stop when done
```

---

## Switch to cloud (production/staging)

Production credentials are in `.env.local.cloud` (git-ignored, manually backed up).

```bash
# Switch to cloud
cp .env.local.cloud .env.local
bun run dev

# Switch back to local
bunx supabase start
# restore local credentials in .env.local (see supabase status)
```

Cloud env values:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<project-ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon JWT from Supabase dashboard>"
SUPABASE_SERVICE_ROLE_KEY="<service_role JWT from Supabase dashboard>"
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres"
```

Get from: Supabase dashboard → Project Settings → API (keys) + Database (connection strings).

---

## Schema changes

### During development (iterate freely)

```bash
# 1. Edit prisma/schema.prisma
# 2. Apply to local DB immediately (no migration file)
bun run db:push

# 3. Regenerate Prisma client
bun run db:generate
```

### When ready to commit

```bash
# 1. Run security advisors
bunx supabase db advisors

# 2. Generate migration from diff
bunx supabase db pull <descriptive-name> --local --yes
# Creates supabase/migrations/<timestamp>_<descriptive-name>.sql

# 3. Verify migration list
bunx supabase migration list --local

# 4. If Prisma schema changed, also create a Prisma migration
bun run db:migrate
```

### Apply migrations to local after pulling from git

```bash
bunx supabase db push        # applies supabase/migrations/ to local DB
bun run db:generate          # regenerate Prisma client
```

---

## Reset local DB (wipe all data)

**Warning:** Destroys all local data. Cannot be undone on local.

```bash
bunx supabase db reset
```

Reruns all migrations from scratch. Useful when migrations conflict or DB state is broken.

---

## Inspect local DB

```bash
# Studio (browser UI)
open http://127.0.0.1:54323

# CLI query
bunx supabase db query "SELECT * FROM brigades LIMIT 10;"

# Check tables
bunx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Check RLS status
bunx supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

## Seed test data

```bash
# Run seed script (if exists)
bun run db:seed

# Or insert manually via Studio or CLI
bunx supabase db query "INSERT INTO brigades (...) VALUES (...);"
```

---

## Troubleshooting

### `supabase start` fails — migrations error

Symptom: `ERROR: relation "public.profiles" does not exist`

Cause: SQL migrations running before Prisma DDL migration.

Fix: Ensure `supabase/migrations/` contains a Prisma DDL migration with an earlier timestamp than the RLS/trigger migrations.

```bash
# Regenerate the DDL migration (already exists as 20260418082000_prisma_schema.sql)
# If lost, recreate:
bunx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > supabase/migrations/20260418082000_prisma_schema.sql
bunx supabase db reset
```

### Docker not running

```bash
# Check Docker
docker ps

# If not running, start Docker daemon first, then:
bunx supabase start
```

### Port conflict

Default ports: 54321 (API), 54322 (DB), 54323 (Studio), 54324 (Mailpit).

Change in `supabase/config.toml`:

```toml
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
```

### Prisma client out of date

```bash
bun run db:generate
```

### Auth emails not arriving (local)

All auth emails are captured by Mailpit at http://127.0.0.1:54324. No real emails sent in local dev.

---

## Environment variable reference

| Variable                        | Local                                                     | Cloud                       | Notes                                     |
| ------------------------------- | --------------------------------------------------------- | --------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `http://127.0.0.1:54321`                                  | `https://<ref>.supabase.co` | Browser-safe                              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...`                                      | JWT anon key                | Browser-safe                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | `sb_secret_...`                                           | JWT service_role            | **Server-only. Never expose to browser.** |
| `DATABASE_URL`                  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Pooler URL (port 6543)      | Prisma runtime                            |
| `DIRECT_URL`                    | Same as DATABASE_URL                                      | Direct URL (port 5432)      | Prisma migrations only                    |
