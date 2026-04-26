# Medical Brigade Management Web App

> 🇬🇧 [English version available here](./README.md)

Aplicación web para equipos de brigadas médicas que permite gestionar eventos de salud comunitaria de un solo día. Cada brigada tiene múltiples áreas médicas con colas independientes en tiempo real. El personal registra pacientes, los asigna a áreas y opera dashboards en vivo desde tablets o teléfonos en campo.

🌐 **Producción:** [medical-brigade-management-webapp.vercel.app](https://medical-brigade-management-webapp.vercel.app)

---

## Qué hace

- **Gestión de brigadas** — crear, configurar, abrir y cerrar eventos médicos de un día.
- **Configuración de áreas** — definir estaciones médicas (Odontología, Enfermería, etc.) con prefijo, color y límite de pacientes opcionales.
- **Registro de pacientes** — registrar pacientes con datos básicos y asignarlos a una o más áreas en un solo paso.
- **Generación automática de turnos** — cada paciente recibe un número global de llegada y un boleto por área (ej. `D-12`).
- **Dashboards de área en tiempo real** — cada área ve su turno actual y cola de espera en vivo mediante WebSockets.
- **Operaciones de cola** — llamar siguiente, llamar específico, mover al final o retirar — todos con confirmación.
- **Gestión de personal** — invitar usuarios registrados o generar credenciales para personal no registrado directamente desde el panel del director.
- **Modo pantalla pública** — los dashboards de área pueden hacerse públicos (sin login) para TVs o tablets en sala de espera.
- **Vista general del director** — métricas de la brigada en tiempo real: pacientes por área, throughput en el tiempo, alertas de capacidad.

---

## Stack

| Capa          | Tecnología                     |
| ------------- | ------------------------------ |
| Framework     | Next.js 16 (App Router)        |
| Lenguaje      | TypeScript 5 (strict)          |
| UI            | shadcn/ui + Tailwind CSS v4    |
| Gráficas      | Recharts                       |
| ORM           | Prisma 7                       |
| Base de datos | PostgreSQL via Supabase        |
| Autenticación | Supabase Auth                  |
| Tiempo real   | Supabase Realtime (WebSockets) |
| Validación    | Zod                            |
| Runtime       | Bun                            |
| Deploy        | Vercel                         |
| Tests         | Vitest + Playwright            |

---

## Arquitectura

**Clean Architecture + Screaming Architecture + Vertical Slicing.**

Los slices de dominio (`brigades/`, `patients/`, `turnos/`, `areas/`, `members/`) contienen cada uno sus propias capas `domain/`, `application/` e `infrastructure/`. La lógica de negocio nunca se filtra hacia los route handlers ni los componentes de React.

Regla de dependencias: `domain/ ← application/ ← infrastructure/ ← app/`. Nunca al revés.

Documentación completa: [`architecture/`](./architecture/README.md). Léela antes de contribuir.

---

## Inicio rápido

### Requisitos previos

- [Bun](https://bun.sh) (latest)
- [Docker](https://www.docker.com) (para Supabase local)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Configuración

```bash
# 1. Clonar
git clone https://github.com/your-org/medical-brigade-management-webapp.git
cd medical-brigade-management-webapp

# 2. Instalar dependencias
bun install

# 3. Iniciar Supabase local (DB, Auth, Realtime, Studio)
bunx supabase start

# 4. Generar cliente de Prisma
bun run db:generate
```

### Variables de entorno

`supabase start` imprime todas las credenciales locales. Cópialas en `.env.local`:

```bash
# Públicas — seguras para exponer al navegador
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."

# Solo servidor — nunca se envían al cliente
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# Postgres — local (sin PgBouncer en dev local)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

Para credenciales cloud (producción / staging), ver [runbook de entorno](./docs/runbooks/es/00-entorno-local.md).

### Ejecutar

```bash
bun run dev
# → http://localhost:3000

# Supabase Studio (explorador de DB local)
# → http://127.0.0.1:54323
```

---

## Scripts

```bash
# Desarrollo
bun run dev           # Servidor dev → http://localhost:3000
bun run build         # Build de producción
bun run lint          # ESLint
bun run format        # Prettier

# Tests
bun run test          # Vitest (unit + integración)
bun run test:e2e      # Playwright (end-to-end)

# Base de datos
bun run db:generate   # Regenerar cliente Prisma tras cambios de schema
bun run db:migrate    # Crear nueva migración (solo dev)
bun run db:push       # Push del schema sin migración (solo prototipado)
bun run db:studio     # Abrir Prisma Studio

# Supabase local
bunx supabase start   # Iniciar stack local
bunx supabase stop    # Detener stack local
bunx supabase status  # Ver URLs y credenciales
bunx supabase db push # Aplicar supabase/migrations/ a DB local
```

---

## Estructura del proyecto

```
medical-brigade-management-webapp/
├── app/               ← Next.js App Router (páginas + rutas API)
│   ├── (auth)/        ← login, registro, invitación
│   ├── (dashboard)/   ← páginas protegidas (sesión requerida)
│   │   └── dashboard/ ← inicio, brigadas, pacientes, perfil
│   └── (public)/      ← dashboards públicos de área (sin login)
├── src/               ← Slices de dominio (Clean + Screaming Architecture)
│   ├── brigades/
│   ├── areas/
│   ├── patients/
│   ├── turnos/
│   └── members/
├── shared/            ← Infraestructura transversal (Supabase, Prisma, Realtime)
├── components/        ← Shell, layout y primitivas shadcn/ui
│   ├── layout/        ← BottomNav, TopGreeting, PageHeader, MobileShell
│   └── ui/            ← button, card, input, badge, avatar, ...
├── prisma/            ← schema.prisma
├── supabase/
│   ├── config.toml    ← config de dev local
│   └── migrations/    ← DDL de Prisma + políticas RLS + triggers + índices
└── docs/runbooks/     ← Guías de incidentes (EN + ES)
```

Consulta [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md) para el árbol completo.

---

## Páginas

| Ruta                                    | Descripción                                         |
| --------------------------------------- | --------------------------------------------------- |
| `/`                                     | Landing                                             |
| `/login`                                | Iniciar sesión                                      |
| `/register`                             | Crear cuenta                                        |
| `/dashboard`                            | Inicio del director — brigada activa + estadísticas |
| `/dashboard/brigades`                   | Lista de brigadas + filtros                         |
| `/dashboard/brigades/new`               | Crear brigada + áreas                               |
| `/dashboard/brigades/[id]`              | Detalle de brigada — áreas, estadísticas, acciones  |
| `/dashboard/brigades/[id]/settings`     | Editar brigada, áreas y miembros                    |
| `/dashboard/brigades/[id]/patients/new` | Registrar paciente + asignar áreas                  |
| `/dashboard/brigades/[id]/areas/[id]`   | Dashboard de cola del área (vista del personal)     |
| `/dashboard/patients`                   | Búsqueda de pacientes en brigada activa             |
| `/dashboard/profile`                    | Perfil de usuario + preferencias                    |
| `/dashboard/[brigadeId]/[areaId]`       | Pantalla pública de turnos (TV / tablet)            |

---

## API

Todos los endpoints versionados bajo `/api/v1/`. Ver [`architecture/07-api-routes.md`](./architecture/07-api-routes.md) para el mapa completo de rutas, formas de request/response y códigos de error.

Envelope de respuesta:

```json
{ "success": true, "data": {}, "errors": null }
```

Códigos de error en `SCREAMING_SNAKE_CASE` en inglés. Mensajes de error en español.

---

## Cambiar entre local y cloud

```bash
# Cambiar a Supabase local
bunx supabase start
# (credenciales en .env.local — ver supabase status)

# Volver a cloud
cp .env.local.cloud .env.local
```

---

## Cómo contribuir

1. Crear rama desde `dev`: `git checkout -b feature/tu-feature dev`
2. Realizar cambios.
3. `bun run lint` + `bun run test` antes de hacer push.
4. Abrir PR hacia `dev`.
5. Todos los checks de GitHub Actions deben pasar antes de mergear.

Ver [`architecture/08-deployment.md`](./architecture/08-deployment.md) para la estrategia de ramas y el pipeline de CI/CD.

---

## Runbooks

| #   | Runbook (EN)                                                             | Guía (ES)                                                                   | Cuándo usar                                            |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------ |
| 00  | [Dev Environment](./docs/runbooks/00-dev-environment.md)                 | [Entorno local](./docs/runbooks/es/00-entorno-local.md)                     | Configurar entorno local / cambiar entre local y cloud |
| 01  | [WebSocket Disconnection](./docs/runbooks/01-websocket-disconnection.md) | [Desconexión del dashboard](./docs/runbooks/es/01-desconexion-websocket.md) | Dashboard deja de actualizarse                         |
| 02  | [Queue Stuck](./docs/runbooks/02-queue-stuck.md)                         | [Cola trabada](./docs/runbooks/es/02-cola-trabada.md)                       | Turno no avanza                                        |
| 03  | [Patient Duplicate](./docs/runbooks/03-patient-duplicate.md)             | [Paciente duplicado](./docs/runbooks/es/03-paciente-duplicado.md)           | Paciente registrado dos veces                          |

---

## Licencia

Open source. Licencia por definir.
