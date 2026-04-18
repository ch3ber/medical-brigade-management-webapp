# 08 — Deployment

## Infrastructure overview

```
GitHub (source of truth)
    │
    ├── feature/* → PR → GitHub Actions (lint + test) → Vercel Preview
    ├── develop   → PR → GitHub Actions (lint + test) → Vercel Preview
    └── main      → GitHub Actions (lint + test + migrate) → Vercel Production
                                                                    │
                                                            Supabase (single project)
                                                            PostgreSQL + Auth + Realtime
```

---

## Environments

| Environment | Git branch | Vercel deployment | Supabase project |
|---|---|---|---|
| Local development | any | `localhost:3000` | Single Supabase project (dev data) |
| Preview | `feature/*`, `develop` | Auto-generated URL per PR | Single Supabase project (dev data) |
| Production | `main` | `your-domain.com` | Single Supabase project (prod data) |

### Single Supabase project

One Supabase project serves all environments. Local and preview deployments use the same project as production but operate on separate data by convention — development brigades are prefixed or tagged to distinguish them from real data.

This simplifies the setup significantly for a solo project at this scale. If data isolation between environments becomes a requirement in the future, a second Supabase project can be added for development.

---

## Git branching strategy

```
main          ← production. Only receives merges from develop via PR.
  └── develop ← integration branch. Receives merges from feature branches via PR.
        └── feature/[ticket-or-description] ← one branch per feature or fix.
```

**Rules:**
- Direct commits to `main` are not allowed.
- All merges to `main` require a passing GitHub Actions workflow.
- Feature branches are created from `develop` and merged back into `develop`.
- `develop` is merged into `main` for each release.

---

## Vercel setup

### Project configuration

Vercel detects Next.js automatically. No `vercel.json` needed. Configure the following in the Vercel dashboard:

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `.` (project root) |
| Build command | `bun run build` |
| Install command | `bun install` |
| Output directory | `.next` (auto-detected) |

### Branch deployments

| Branch | Deployment type | URL |
|---|---|---|
| `main` | Production | `your-domain.com` |
| `develop` | Preview | `develop.your-project.vercel.app` |
| `feature/*` | Preview | Auto-generated per push |

Preview deployments are created automatically for every PR targeting `develop` or `main`. The preview URL is posted as a comment on the PR by Vercel's GitHub integration.

### Serverless function limits

All `app/api/v1/**` Route Handlers deploy as Vercel Serverless Functions.

| Plan | Max duration | Notes |
|---|---|---|
| Hobby | 10 seconds | Sufficient for all queue operations |
| Pro | 60 seconds | Recommended for production |

Queue operations (advisory lock + transaction) complete well under 2 seconds under normal load. The 10-second limit on Hobby is not a concern for this project's scale.

---

## Environment variables

### Required variables

Set these in the Vercel dashboard under **Settings → Environment Variables**. Apply each to the correct environments (Production, Preview, Development).

```bash
# ─── Public (exposed to the browser) ─────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ─── Server only (never sent to the client) ───────────────────────────────────
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Supabase connection pooler — used by Prisma at runtime (port 6543, PgBouncer)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct connection — used by Prisma for migrations only (port 5432, no pooler)
DIRECT_URL=postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
```

> `DATABASE_URL` uses the Supabase connection pooler for runtime queries. `DIRECT_URL` bypasses the pooler and is used only by `prisma migrate deploy` — never at runtime.

### `.env.example`

The `.env.example` file at the project root lists every required key with empty values. It is committed to the repository. Never commit `.env.local` or any file with real credentials.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
```

---

## Prisma migrations

Migrations are the only way to change the database schema in production. Never use `prisma db push` against production.

### Development workflow

```bash
# 1. Edit prisma/schema.prisma
# 2. Create a new migration
bun run db:migrate --name describe_the_change

# 3. Prisma applies the migration to the local/dev DB and regenerates the client
# 4. Commit both the schema change and the migration file
```

### Production workflow

Migrations run automatically in CI before every production deploy (see GitHub Actions below). The command used is:

```bash
bunx prisma migrate deploy
```

`migrate deploy` applies all pending migrations in order. It never creates new migrations — it only applies existing ones. It uses `DIRECT_URL` to bypass the connection pooler.

### Migration rules

- Never edit a migration file after it has been committed.
- Never delete a migration file.
- Every schema change must go through a migration, even in development.
- `prisma db push` is allowed only for local prototyping on a throwaway database — never against the shared Supabase project.

---

## Supabase migrations (RLS + triggers)

RLS policies, database triggers, and custom indexes live in `supabase/migrations/` as plain SQL files. These are applied via the Supabase CLI, separately from Prisma migrations.

```bash
# Apply pending Supabase migrations
bunx supabase db push

# Link to the remote project (run once per machine)
bunx supabase link --project-ref <project-ref>
```

Supabase migrations are applied manually before a release when they contain RLS or trigger changes. They are not yet wired into the GitHub Actions pipeline — add this when the number of SQL migrations grows.

---

## GitHub Actions

### CI workflow — runs on every PR and push

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Lint
        run: bun run lint

      - name: Type check
        run: bunx tsc --noEmit

      - name: Generate Prisma client
        run: bunx prisma generate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Run unit and integration tests
        run: bun run test
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### Deploy workflow — runs on merge to main

```yaml
# .github/workflows/deploy.yml
name: Deploy to production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run database migrations
        run: bunx prisma migrate deploy
        env:
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy to Vercel (production)
        run: bunx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Required GitHub secrets

Set these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler connection string |
| `DIRECT_URL` | Supabase direct connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

---

## Local development setup

```bash
# Prerequisites: Bun (latest), Supabase CLI

# 1. Clone the repository
git clone https://github.com/your-org/medical-brigade-management-webapp.git
cd medical-brigade-management-webapp

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in .env.local with your Supabase project credentials

# 4. Generate Prisma client
bun run db:generate

# 5. Apply pending migrations
bun run db:migrate

# 6. (Optional) Seed development data
bun run db:seed

# 7. Start the development server
bun run dev
# → http://localhost:3000
```

---

## Monitoring

| Tool | What it covers | Plan |
|---|---|---|
| Vercel Analytics | Core web vitals, request latency, error rates | Included in Vercel |
| Supabase Dashboard | Query performance, connection pool usage, Realtime stats, Auth logs | Included in Supabase |
| Vercel Function Logs | Serverless function execution logs, errors | Included in Vercel |

Sentry or a similar error tracking service is recommended for v2 when the app is in active production use.
