# 07 — API Routes

All API routes are Next.js Route Handlers under `app/api/v1/`. Business logic is never written inside route handlers — they are thin entry points that validate the request, call a use case from `src/`, and return the response.

## Versioning

All routes are prefixed with `/api/v1/`. This applies to both authenticated and public endpoints.

```
/api/v1/brigades/[brigadeId]/**          ← authenticated routes
/api/v1/public/[brigadeId]/areas/[areaId] ← public dashboard route
```

When a breaking change is needed in the future, a new `/api/v2/` prefix is introduced alongside `/api/v1/`. Both versions run simultaneously until `/api/v1/` is deprecated and removed. Non-breaking changes (new optional fields, new endpoints) are added to the current version without bumping.

The folder structure in `app/api/` mirrors this:

```
app/api/
└── v1/
    ├── brigades/
    │   └── [brigadeId]/
    │       └── ...
    └── public/
        └── [brigadeId]/
            └── areas/
                └── [areaId]/
                    └── route.ts
```

---

## Conventions

### Authentication
All routes require a valid Supabase session cookie managed by `@supabase/ssr`. The session is read server-side on every request via `shared/supabase/server.ts`. No Bearer tokens — the cookie is handled automatically by the browser and by `middleware.ts`.

Public area dashboards (`/api/v1/public/**`) validate a dashboard token from the query string instead of a session cookie.

### Response envelope
Every response — success or error — uses the same shape:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "errors": null
}

// Error
{
  "success": false,
  "data": null,
  "errors": {
    "code": "BRIGADA_NO_ENCONTRADA",
    "message": "La brigada solicitada no existe o no tienes acceso a ella."
  }
}
```

### HTTP status codes
Standard HTTP status codes are used alongside the envelope. The `success` field in the envelope always reflects the HTTP status.

| Status | When |
|---|---|
| `200` | Successful GET, PATCH |
| `201` | Successful POST (resource created) |
| `400` | Validation error (invalid request body) |
| `401` | No valid session |
| `403` | Valid session but insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict (e.g. area limit reached, duplicate turno) |
| `500` | Unexpected server error |

### Error codes
All error codes are in SCREAMING_SNAKE_CASE in English. Error messages are always in Spanish.

| Code | HTTP | Message |
|---|---|---|
| `SESION_REQUERIDA` | 401 | La sesión ha expirado. Por favor inicia sesión nuevamente. |
| `SIN_PERMISO` | 403 | No tienes permiso para realizar esta acción. |
| `BRIGADA_NO_ENCONTRADA` | 404 | La brigada solicitada no existe o no tienes acceso a ella. |
| `AREA_NO_ENCONTRADA` | 404 | El área solicitada no existe. |
| `PACIENTE_NO_ENCONTRADO` | 404 | El paciente solicitado no existe. |
| `TURNO_NO_ENCONTRADO` | 404 | El turno solicitado no existe. |
| `BRIGADA_CERRADA` | 409 | Esta brigada está cerrada. No se permiten modificaciones. |
| `BRIGADA_NO_ACTIVA` | 409 | La brigada debe estar activa para realizar esta acción. |
| `LIMITE_AREA_ALCANZADO` | 409 | El área ha alcanzado su límite de pacientes. |
| `TURNO_NO_EN_ESPERA` | 409 | El turno no está en estado de espera. |
| `YA_EXISTE_TURNO_LLAMADO` | 409 | Ya hay un turno siendo atendido en esta área. |
| `VALIDACION_FALLIDA` | 400 | Los datos enviados no son válidos. |
| `ERROR_INTERNO` | 500 | Ocurrió un error interno. Por favor intenta de nuevo. |

### Zod validation
Every POST and PATCH body is validated with a Zod schema before reaching the use case. Validation errors return `400` with the `VALIDACION_FALLIDA` code and a `fields` array:

```typescript
{
  "success": false,
  "data": null,
  "errors": {
    "code": "VALIDACION_FALLIDA",
    "message": "Los datos enviados no son válidos.",
    "fields": [
      { "field": "nombre", "message": "El nombre es requerido." },
      { "field": "fecha", "message": "La fecha debe ser una fecha válida." }
    ]
  }
}
```

---

## Brigades

### `GET /api/brigades/[brigadeId]`
Returns brigade details. Caller must be a brigade member.

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "nombre": "Brigada Norte 2025",
    "descripcion": "Brigada comunitaria en la colonia norte.",
    "ubicacion": "Colonia Norte, Monterrey",
    "fecha": "2025-06-15",        // ISO 8601 date only
    "status": "ACTIVE",
    "abertaEn": "2025-06-15T08:00:00Z",
    "cerradaEn": null,
    "creadoPor": "uuid",
    "creadoEn": "2025-06-01T10:00:00Z",
    "totalAreas": 6,
    "totalMiembros": 12
  },
  "errors": null
}
```

### `PATCH /api/brigades/[brigadeId]`
Updates brigade settings. Director or co-director only. Brigade must not be `CLOSED`.

**Body**
```typescript
{
  nombre?: string;
  descripcion?: string;
  ubicacion?: string;
  fecha?: string;           // ISO 8601 date
}
```

### `POST /api/brigades/[brigadeId]/clone`
Clones the brigade (new DRAFT brigade with same areas, no patients or members).

**Body**
```typescript
{
  nombre: string;           // name for the new brigade
  fecha: string;            // date for the new brigade
}
```

**Response `201`** — returns the new brigade.

---

## Brigade lifecycle

### `POST /api/brigades/[brigadeId]/open`
Transitions brigade from `DRAFT` → `ACTIVE`. Records `abertaEn` timestamp. Director or co-director only.

**Body** — empty `{}`

### `POST /api/brigades/[brigadeId]/close`
Transitions brigade from `ACTIVE` → `CLOSED`. Records `cerradaEn` timestamp. Director or co-director only.

**Body** — empty `{}`

---

## Areas

### `GET /api/brigades/[brigadeId]/areas`
Returns all active areas ordered by `order`. Brigade members only.

**Response `200`**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Dental",
      "prefijo": "D",
      "color": "#4F86C6",
      "limitePacientes": 50,
      "orden": 1,
      "activa": true,
      "totalEnEspera": 12,
      "totalAtendidos": 8
    }
  ],
  "errors": null
}
```

### `POST /api/brigades/[brigadeId]/areas`
Creates a new area. Director or co-director only.

**Body**
```typescript
{
  nombre: string;            // required
  prefijo: string;           // required, max 4 chars, e.g. "D", "ENF"
  color: string;             // required, hex e.g. "#4F86C6"
  limitePacientes?: number;  // optional, null = unlimited
  orden?: number;            // display order, defaults to last
}
```

### `PATCH /api/brigades/[brigadeId]/areas/[areaId]`
Updates an area. Director or co-director only. All fields optional.

**Body** — same fields as POST, all optional.

### `DELETE /api/brigades/[brigadeId]/areas/[areaId]`
Soft-deletes area (`activa = false`). Director only. Returns `409` if area has `WAITING` or `CALLED` turnos.

### `POST /api/brigades/[brigadeId]/areas/[areaId]/clone`
Copies this area (name, prefix, color, limit) into the same or a different brigade.

**Body**
```typescript
{
  brigadaDestinoId: string;  // can be the same brigade
}
```

---

## Queue actions (RPC-style)

These endpoints are actions, not resources. They use `POST` regardless of the operation.

### `POST /api/brigades/[brigadeId]/areas/[areaId]/next`
Advances the queue in strict order. Marks current `CALLED` turno as `SERVED`, promotes next `WAITING` turno to `CALLED`. Requires staff, co-director, or director role.

**Body** — empty `{}`

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "atendido": {             // turno just marked SERVED (null if queue was already empty)
      "id": "uuid",
      "label": "D-11",
      "atendidoEn": "2025-06-15T10:32:00Z"
    },
    "llamado": {              // turno now CALLED (null if no WAITING turnos remain)
      "id": "uuid",
      "label": "D-12",
      "paciente": { "nombre": "Juan Pérez", "edad": 34 },
      "llamadoEn": "2025-06-15T10:32:01Z"
    },
    "enEspera": 8             // remaining WAITING count after transition
  },
  "errors": null
}
```

### `POST /api/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/call`
Calls a specific `WAITING` turno out of order. If another turno is currently `CALLED`, it is marked `SERVED` first. Requires staff, co-director, or director.

**Body** — empty `{}`

**Response `200`** — same shape as `/next`.

### `POST /api/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/move`
Moves a `CALLED` turno to the tail of the `WAITING` queue. Increments `vecesMovido`. Promotes next `WAITING` turno to `CALLED`. Requires staff, co-director, or director.

**Body** — empty `{}`

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "movido": {
      "id": "uuid",
      "label": "D-12",
      "vecesMovido": 2,
      "nuevoOrden": 24          // new areaOrder at the tail
    },
    "llamado": { ... } | null   // next turno now CALLED
  },
  "errors": null
}
```

### `POST /api/brigades/[brigadeId]/areas/[areaId]/turnos/[turnoId]/remove`
Permanently removes a `CALLED` turno from the queue (`REMOVED`). Promotes next `WAITING` turno to `CALLED`. Requires staff, co-director, or director.

**Body** — empty `{}`

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "eliminado": { "id": "uuid", "label": "D-12" },
    "llamado": { ... } | null
  },
  "errors": null
}
```

---

## Patients

### `GET /api/brigades/[brigadeId]/patients`
Returns paginated patient list. Brigade members only.

**Query params**
| Param | Type | Description |
|---|---|---|
| `areaId` | `string` | Filter by area (optional) |
| `status` | `TurnoStatus` | Filter by turno status (optional) |
| `busqueda` | `string` | Search by patient name (optional) |
| `pagina` | `number` | Page number, default `1` |
| `limite` | `number` | Page size, default `50`, max `100` |

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "pacientes": [
      {
        "id": "uuid",
        "nombreCompleto": "María García",
        "edad": 45,
        "genero": "female",
        "telefono": "81-1234-5678",
        "direccion": "Calle Roble 12, Col. Norte",
        "quiereVisitaIglesia": false,
        "ordenGlobal": 3,
        "registradoEn": "2025-06-15T08:15:00Z",
        "turnos": [
          {
            "id": "uuid",
            "areaId": "uuid",
            "areaNombre": "Dental",
            "label": "D-3",
            "status": "SERVED",
            "vecesMovido": 0
          }
        ]
      }
    ],
    "total": 87,
    "pagina": 1,
    "limite": 50
  },
  "errors": null
}
```

### `POST /api/brigades/[brigadeId]/patients`
Registers a new patient and creates one turno per selected area. Runs atomically inside a transaction with advisory locks. Brigade must be `ACTIVE`. Staff, co-director, or director only.

**Body**
```typescript
{
  nombreCompleto: string;         // required
  edad: number;                   // required, positive integer
  genero: "male" | "female" | "other";  // required
  telefono: string;               // required
  direccion: string;              // required
  quiereVisitaIglesia: boolean;   // required
  areaIds: string[];              // required, min 1 area
}
```

**Response `201`**
```typescript
{
  "success": true,
  "data": {
    "paciente": {
      "id": "uuid",
      "nombreCompleto": "María García",
      "ordenGlobal": 47
    },
    "turnos": [
      {
        "id": "uuid",
        "areaId": "uuid",
        "areaNombre": "Dental",
        "label": "D-12",      // shown on physical ticket
        "ordenArea": 12,
        "status": "WAITING"
      },
      {
        "id": "uuid",
        "areaId": "uuid",
        "areaNombre": "Enfermería",
        "label": "ENF-8",
        "ordenArea": 8,
        "status": "WAITING"
      }
    ]
  },
  "errors": null
}
```

### `GET /api/brigades/[brigadeId]/patients/[patientId]`
Returns full patient detail including all turnos. Brigade members only.

### `POST /api/brigades/[brigadeId]/patients/[patientId]/areas`
Adds a patient to an additional area after registration. Creates one new turno. Brigade must be `ACTIVE`.

**Body**
```typescript
{
  areaId: string;   // required
}
```

**Response `201`** — returns the new turno with its label.

---

## Members

### `GET /api/brigades/[brigadeId]/members`
Returns all brigade members. Director or co-director only.

**Response `200`**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "staff@example.com",
      "rol": "STAFF",
      "aceptadoEn": "2025-06-10T09:00:00Z",  // null = invite pending
      "retenerAccesoAlCerrar": false,
      "perfil": {
        "nombreCompleto": "Carlos Ramos",
        "avatarUrl": null
      } | null    // null if invite not yet accepted
    }
  ],
  "errors": null
}
```

### `POST /api/brigades/[brigadeId]/members`
Invites a member. Two modes based on `modo`:

**Body — invite link (existing user)**
```typescript
{
  modo: "invitacion";
  email: string;
  rol?: "STAFF" | "CO_DIRECTOR";   // defaults to STAFF
}
```

**Body — generated credentials (non-registered staff)**
```typescript
{
  modo: "credenciales";
  email: string;
  usuario: string;       // generated username
  contrasena: string;    // plain text, hashed server-side before storage
  rol?: "STAFF";         // generated credentials are always STAFF
}
```

**Response `201`**
```typescript
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "staff@example.com",
    "rol": "STAFF",
    "modo": "credenciales" | "invitacion",
    "tokenInvitacion": "uuid" | null   // only for invite mode
  },
  "errors": null
}
```

### `PATCH /api/brigades/[brigadeId]/members/[memberId]`
Updates a member's role or post-close access setting. Director or co-director only.

**Body**
```typescript
{
  rol?: "STAFF" | "CO_DIRECTOR" | "DIRECTOR";
  retenerAccesoAlCerrar?: boolean;
}
```

### `DELETE /api/brigades/[brigadeId]/members/[memberId]`
Removes a member from the brigade. Director or co-director only. Cannot remove self.

---

## Public dashboard

### `GET /api/public/[brigadeId]/areas/[areaId]`
Returns current queue state for an area. No session required — validates `token` query param instead.

**Query params**
| Param | Required | Description |
|---|---|---|
| `token` | Yes | Public dashboard token (UUID generated at brigade activation) |

**Response `200`**
```typescript
{
  "success": true,
  "data": {
    "area": {
      "nombre": "Dental",
      "prefijo": "D",
      "color": "#4F86C6"
    },
    "turnoActual": {
      "label": "D-12"           // no patient name in public mode
    } | null,
    "enEspera": [
      { "label": "D-13" },
      { "label": "D-14" }
    ]
  },
  "errors": null
}
```
