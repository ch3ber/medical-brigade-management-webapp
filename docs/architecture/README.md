# Architecture — medical-brigade-management-webapp

This folder is the single source of truth for all architecture decisions, project structure, and technical conventions. Read this file first before opening any other document. Keep it updated as the project evolves.

---

## What this project is

**medical-brigade-management-webapp** is a web application built for medical brigade teams to manage and operate their one-day medical brigade events.

A **medical brigade** is a single-day event where a team of medical volunteers sets up multiple medical stations (areas) in a community. Patients arrive, get registered, receive a shift ticket (turno), and are attended across one or more areas throughout the day.

The app replaces manual paper-based shift management with a real-time digital system. Each medical area gets its own live dashboard showing the current patient being served and the waiting queue for that area.

---

## Who uses it

| User                 | What they do in the app                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Brigade Director** | Creates and configures brigades, sets up medical areas, invites staff, monitors the full brigade in real time |
| **Brigade Staff**    | Registers incoming patients, assigns them to an area, advances the queue during the event                     |
| **Platform Admin**   | Internal role with full access across all brigades for support and maintenance                                |

---

## Document index

Read in order on your first pass. After that, jump directly to the relevant doc.

| #   | File                        | What it covers                                                           |
| --- | --------------------------- | ------------------------------------------------------------------------ |
| 01  | `01-overview.md`            | Core concepts, user flows, scope, and constraints                        |
| 02  | `02-stack.md`               | Full technology stack with version numbers and decision rationale        |
| 03  | `03-database-schema.md`     | PostgreSQL schema, relationships, enums, indexes, and RLS policies       |
| 04  | `04-auth-and-roles.md`      | Authentication flow, role system, and permission matrix                  |
| 05  | `05-realtime-and-shifts.md` | Turno (shift) lifecycle, queue design, and Supabase Realtime integration |
| 06  | `06-folder-structure.md`    | Next.js project layout, file naming conventions                          |
| 07  | `07-api-routes.md`          | All API endpoints with request and response shapes                       |
| 08  | `08-deployment.md`          | Vercel + Supabase setup, environment variables, CI/CD                    |

---

## Guiding principles

These principles inform every technical decision in this project. When in doubt, come back here.

**Simplicity over premature scalability.**
The app targets fewer than 50 simultaneous users per brigade. No Redis, no message queues, no microservices. A Next.js monolith backed by Supabase is the correct unit of complexity for this use case.

**Supabase is the single backend.**
Database, authentication, real-time subscriptions, and storage all live in one managed Supabase project. No separate auth server, no custom WebSocket server, no third-party pub/sub service.

**Type safety end to end.**
TypeScript on the frontend, Prisma for the database client, and Zod for request validation. A mismatch between the database shape and application code must be a compile-time error, not a runtime crash in a live brigade.

**Security lives at the database layer.**
Row-Level Security (RLS) policies enforce data isolation at the PostgreSQL level. A brigade director cannot access another brigade's data even if there is a bug in the API layer.

**Brigades are fully isolated.**
Patient records, shift history, and area configuration do not bleed across brigade boundaries. The same physical patient attending two different brigades is two independent records by design.

**Mobile-first UI, web-first architecture.**
Medical staff use tablets and phones in the field. The web app must be fully responsive. A native mobile app is planned for a future version — the API design should not create obstacles for that.

---

## Future roadmap (out of scope for v1)

- Native mobile app (iOS / Android) consuming the same API.
- Cross-brigade patient identity matching.
- Clinical notes and medical record attachments.
- Offline mode for brigades in areas with poor connectivity.
- Inventory and medication tracking.
