# 00 — Entorno de Desarrollo Local

Configuración del entorno local con Supabase y cambio entre local y cloud.

---

## Stack local

| Servicio     | URL                                                     | Descripción                        |
| ------------ | ------------------------------------------------------- | ---------------------------------- |
| Next.js      | http://localhost:3000                                   | Servidor de desarrollo             |
| Supabase API | http://127.0.0.1:54321                                  | PostgREST + Auth + Realtime        |
| Postgres     | postgresql://postgres:postgres@127.0.0.1:54322/postgres | Conexión directa                   |
| Studio       | http://127.0.0.1:54323                                  | Explorador de base de datos        |
| Mailpit      | http://127.0.0.1:54324                                  | Trampa de correos de autenticación |

---

## Configuración inicial (primera vez)

```bash
# 1. Instalar dependencias
bun install

# 2. Iniciar Supabase local (descarga imágenes Docker la primera vez — ~2 min)
bunx supabase start

# 3. Copiar credenciales locales en .env.local
#    Ejecuta `bunx supabase status` para ver todos los valores
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<publishable key de supabase status>"
SUPABASE_SERVICE_ROLE_KEY="<secret key de supabase status>"
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
EOF

# 4. Generar cliente de Prisma
bun run db:generate

# 5. Iniciar servidor de desarrollo
bun run dev
```

---

## Flujo diario

```bash
bunx supabase start   # iniciar stack local (rápido — imágenes en caché)
bun run dev           # servidor de desarrollo
# ... trabajar ...
bunx supabase stop    # detener al terminar
```

---

## Cambiar a cloud (producción/staging)

Las credenciales de producción están en `.env.local.cloud` (ignorado por git, respaldado manualmente).

```bash
# Cambiar a cloud
cp .env.local.cloud .env.local
bun run dev

# Volver a local
bunx supabase start
# restaurar credenciales locales en .env.local (ver supabase status)
```

Variables para cloud:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon JWT del dashboard de Supabase>"
SUPABASE_SERVICE_ROLE_KEY="<service_role JWT del dashboard de Supabase>"
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<password>@aws-<region>.pooler.supabase.com:5432/postgres"
```

Obtener desde: Supabase dashboard → Project Settings → API (claves) + Database (strings de conexión).

---

## Cambios de schema

### Durante desarrollo (iterar libremente)

```bash
# 1. Editar prisma/schema.prisma
# 2. Aplicar a DB local inmediatamente (sin archivo de migración)
bun run db:push

# 3. Regenerar cliente de Prisma
bun run db:generate
```

### Cuando listo para commit

```bash
# 1. Revisar advisors de seguridad
bunx supabase db advisors

# 2. Generar migración desde el diff
bunx supabase db pull <nombre-descriptivo> --local --yes
# Crea supabase/migrations/<timestamp>_<nombre-descriptivo>.sql

# 3. Verificar lista de migraciones
bunx supabase migration list --local

# 4. Si el schema de Prisma cambió, también crear migración de Prisma
bun run db:migrate
```

### Aplicar migraciones al local después de hacer pull del repositorio

```bash
bunx supabase db push        # aplica supabase/migrations/ a DB local
bun run db:generate          # regenerar cliente de Prisma
```

---

## Resetear DB local (borrar todos los datos)

**Advertencia:** Destruye todos los datos locales. No se puede deshacer en local.

```bash
bunx supabase db reset
```

Vuelve a ejecutar todas las migraciones desde cero. Útil cuando las migraciones generan conflictos o el estado de la DB está roto.

---

## Inspeccionar DB local

```bash
# Studio (interfaz web)
open http://127.0.0.1:54323

# Consulta por CLI
bunx supabase db query "SELECT * FROM brigades LIMIT 10;"

# Ver tablas
bunx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Verificar RLS
bunx supabase db query "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';"
```

---

## Datos de prueba

```bash
# Ejecutar script de seed (si existe)
bun run db:seed

# O insertar manualmente por Studio o CLI
bunx supabase db query "INSERT INTO brigades (...) VALUES (...);"
```

---

## Solución de problemas

### `supabase start` falla — error de migraciones

Síntoma: `ERROR: relation "public.profiles" does not exist`

Causa: Las migraciones SQL corren antes que la migración DDL de Prisma.

Solución: Asegurarse de que `supabase/migrations/` tenga una migración DDL de Prisma con timestamp anterior a las de RLS/triggers.

```bash
# La migración ya existe como 20260418082000_prisma_schema.sql
# Si se perdió, recrear:
bunx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script \
  > supabase/migrations/20260418082000_prisma_schema.sql
bunx supabase db reset
```

### Docker no está corriendo

```bash
# Verificar Docker
docker ps

# Si no está corriendo, iniciar el daemon de Docker primero, luego:
bunx supabase start
```

### Conflicto de puertos

Puertos por defecto: 54321 (API), 54322 (DB), 54323 (Studio), 54324 (Mailpit).

Cambiar en `supabase/config.toml`:

```toml
[api]
port = 54321

[db]
port = 54322

[studio]
port = 54323
```

### Cliente de Prisma desactualizado

```bash
bun run db:generate
```

### Correos de auth no llegan (local)

Todos los correos de autenticación son capturados por Mailpit en http://127.0.0.1:54324. No se envían correos reales en dev local.

---

## Referencia de variables de entorno

| Variable                        | Local                                                     | Cloud                       | Notas                                          |
| ------------------------------- | --------------------------------------------------------- | --------------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | `http://127.0.0.1:54321`                                  | `https://<ref>.supabase.co` | Seguro para el navegador                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_...`                                      | JWT anon key                | Seguro para el navegador                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | `sb_secret_...`                                           | JWT service_role            | **Solo servidor. Nunca exponer al navegador.** |
| `DATABASE_URL`                  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | URL pooler (puerto 6543)    | Prisma en runtime                              |
| `DIRECT_URL`                    | Igual que DATABASE_URL                                    | URL directa (puerto 5432)   | Solo migraciones de Prisma                     |
