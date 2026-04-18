# Medical Brigade Management Web App

Aplicación web para equipos de brigadas médicas que les permite gestionar y operar sus eventos de salud comunitaria de un solo día. Cada brigada tiene múltiples áreas médicas con colas independientes en tiempo real. El staff registra pacientes, los asigna a áreas y opera dashboards en vivo desde tablets o teléfonos en campo.

🌐 **Producción:** [medical-brigade-management-webapp.vercel.app](https://medical-brigade-management-webapp.vercel.app)

---

## Qué hace

- **Gestión de brigadas** — crear, configurar, abrir y cerrar eventos médicos de un día.
- **Configuración de áreas** — definir estaciones médicas (Dental, Enfermería, etc.) con prefijo, color y límite de pacientes opcionales.
- **Registro de pacientes** — registrar pacientes con datos básicos y asignarlos a una o más áreas en un solo paso.
- **Generación automática de turnos** — cada paciente recibe un número global de llegada y un boleto por área (ej. `D-12`).
- **Dashboards de área en tiempo real** — cada área ve su turno actual y cola de espera en vivo mediante WebSockets.
- **Operaciones de cola** — llamar siguiente, llamar específico, mover al final o eliminar — todos con confirmación.
- **Gestión de staff** — invitar usuarios registrados o generar credenciales para staff no registrado directamente desde el panel del director.
- **Modo pantalla pública** — los dashboards de área pueden hacerse públicos (sin login) para TVs o tablets en sala de espera.
- **Vista general del director** — métricas de la brigada en tiempo real: pacientes por área, throughput en el tiempo, alertas de capacidad.

---

## Stack

| Capa          | Tecnología                     |
| ------------- | ------------------------------ |
| Framework     | Next.js 14 (App Router)        |
| Lenguaje      | TypeScript 5                   |
| UI            | shadcn/ui + Tailwind CSS       |
| Gráficas      | Recharts                       |
| ORM           | Prisma 5                       |
| Base de datos | PostgreSQL via Supabase        |
| Autenticación | Supabase Auth                  |
| Tiempo real   | Supabase Realtime (WebSockets) |
| Validación    | Zod                            |
| Runtime       | Bun                            |
| Deploy        | Vercel                         |
| Tests         | Vitest + Playwright            |

---

## Arquitectura

El proyecto sigue **Clean Architecture + Screaming Architecture + Vertical Slicing**. Los slices de dominio (`brigades/`, `patients/`, `turnos/`, `areas/`, `members/`) contienen cada uno sus propias capas `domain/`, `application/` e `infrastructure/`. La lógica de negocio nunca se filtra hacia los route handlers ni los componentes de React.

La documentación completa de arquitectura vive en [`architecture/`](./architecture/README.md). Léela antes de contribuir.

---

## Inicio rápido

### Requisitos previos

- [Bun](https://bun.sh) (latest)
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Un proyecto de Supabase (el plan gratuito funciona para desarrollo)

### Configuración

```bash
# 1. Clonar el repositorio
git clone https://github.com/your-org/medical-brigade-management-webapp.git
cd medical-brigade-management-webapp

# 2. Instalar dependencias
bun install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Abre .env.local y llena tus credenciales de Supabase
```

### Variables de entorno

```bash
# Públicas
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Solo servidor
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=        # Supabase pooler (puerto 6543) — Prisma en runtime
DIRECT_URL=          # Supabase directo (puerto 5432) — solo migraciones de Prisma
```

### Base de datos

```bash
# Generar cliente de Prisma
bun run db:generate

# Aplicar migraciones
bun run db:migrate

# (Opcional) Poblar datos de desarrollo
bun run db:seed
```

### Ejecutar

```bash
bun run dev
# → http://localhost:3000
```

---

## Scripts

```bash
bun run dev           # Servidor de desarrollo
bun run build         # Build de producción
bun run lint          # ESLint
bun run format        # Prettier
bun run test          # Vitest (unit + integración)
bun run test:e2e      # Playwright (end-to-end)
bun run db:generate   # Regenerar cliente de Prisma
bun run db:migrate    # Crear una nueva migración (solo dev)
bun run db:push       # Push del schema sin migración (solo prototipado)
bun run db:studio     # Abrir Prisma Studio
```

---

## Estructura del proyecto

```
medical-brigade-management-webapp/
├── app/               ← Next.js App Router (páginas + rutas API)
├── src/               ← Slices de dominio (Clean + Screaming Architecture)
│   ├── brigades/
│   ├── areas/
│   ├── patients/
│   ├── turnos/
│   └── members/
├── shared/            ← Infraestructura transversal (Supabase, Prisma, Realtime)
├── components/        ← Componentes de shell y layout
├── prisma/            ← Schema + migraciones
├── supabase/          ← Políticas RLS + triggers (SQL)
└── architecture/      ← Documentación completa de arquitectura
```

Consulta [`architecture/06-folder-structure.md`](./architecture/06-folder-structure.md) para el árbol completo de archivos.

---

## API

Todos los endpoints están versionados bajo `/api/v1/`. Consulta [`architecture/07-api-routes.md`](./architecture/07-api-routes.md) para el mapa completo de rutas, formas de request/response y códigos de error.

---

## Cómo contribuir

1. Crea una rama desde `develop`: `git checkout -b feature/tu-feature develop`
2. Realiza tus cambios.
3. Ejecuta `bun run lint` y `bun run test` antes de hacer push.
4. Abre un PR hacia `develop`.
5. Todos los checks de GitHub Actions deben pasar antes de mergear.

Consulta [`architecture/08-deployment.md`](./architecture/08-deployment.md) para la estrategia completa de ramas y el pipeline de CI/CD.

---

## Licencia

Este proyecto es open source. Licencia por definir.
