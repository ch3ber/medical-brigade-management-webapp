# 05 — Realtime and Shift (Turno) System

## Overview

The turno system is the operational core of the app. Every area has an independent queue of turnos. Staff operate their queue from the area dashboard in real time. Two dashboards subscribe to live changes via Supabase Realtime: the area dashboard and the director overview.

---

## Turno lifecycle

A turno moves through the following states. Only the transitions listed below are valid.

```
Patient registered → turno created
        │
        ▼
    WAITING  ◄─────────────────────────────────────────────┐
      │  │                                                  │
      │  └─ Staff calls manually (out of order) ───────────┤
      │                                                     │
      ▼  [Staff presses "Next" or calls manually]          │
    CALLED  (only one per area at a time)                  │
      │                                                     │
      ├─ [Staff confirms "Attended"] ──────► SERVED        │
      │                                                     │
      ├─ [Staff confirms "Move to end"] ───────────────────┘
      │    movedCount + 1, rejoins tail of WAITING queue
      │
      └─ [Staff confirms "Remove"] ────────► REMOVED
           permanently out of the queue
```

**Only one turno per area can have status `CALLED` at any given time.** This is enforced at the API layer — the "call turno" endpoint checks for an existing `CALLED` turno before promoting any `WAITING` turno.

A turno in `CALLED` state stays there indefinitely until the staff takes an action. There is no automatic timeout or fallback.

---

## Turno label format

The physical ticket given to the patient shows the area turno label, not the global order number.

```
label = prefix + "-" + areaOrder
```

Examples: `D-12` (Dentistry, 12th patient), `ENF-3` (Enfermería, 3rd patient), `MG-27` (Medicina General, 27th patient).

The label is computed in the application layer (`lib/utils/turno.ts`) and never stored in the database. The database stores `prefix` (on the `areas` table) and `areaOrder` (on the `turnos` table) separately.

Counter resets: `areaOrder` always starts at 1 for each brigade. Counters are never shared or carried over between brigades.

---

## Queue data model

There is no separate queue table. The `turnos` table IS the queue. Queue state is derived from `status` and `areaOrder`.

### Current turno (CALLED)
```sql
SELECT t.id, t.area_order, t.moved_count, t.called_at,
       p.full_name, p.age, a.prefix
FROM turnos t
JOIN patients p ON p.id = t.patient_id
JOIN areas a ON a.id = t.area_id
WHERE t.area_id = $areaId
  AND t.status = 'CALLED'
LIMIT 1;
```

### Waiting queue (ordered)
```sql
SELECT t.id, t.area_order, t.moved_count,
       p.full_name, a.prefix
FROM turnos t
JOIN patients p ON p.id = t.patient_id
JOIN areas a ON a.id = t.area_id
WHERE t.area_id = $areaId
  AND t.status = 'WAITING'
ORDER BY t.area_order ASC;
```

### Recently served (all served today in this area)
```sql
SELECT t.id, t.area_order, t.called_at, t.served_at,
       p.full_name, a.prefix
FROM turnos t
JOIN patients p ON p.id = t.patient_id
JOIN areas a ON a.id = t.area_id
WHERE t.area_id = $areaId
  AND t.status = 'SERVED'
  AND t.served_at >= CURRENT_DATE
ORDER BY t.served_at DESC;
```

---

## Area dashboard content

The area dashboard is the primary operational screen for medical staff. It is designed to run on a tablet or a TV-sized screen visible to both staff and waiting patients.

### Authenticated mode (staff or director login)
| Section | Content |
|---|---|
| Current turno | Turno label (e.g. `D-12`) displayed large. Patient full name and age. Time elapsed since `calledAt`. Action buttons: Attended, Move to end, Remove. |
| Waiting queue | Ordered list of all `WAITING` turnos. Each row: turno label + patient full name. |
| Recently served | All `SERVED` turnos for today in this area. Each row: turno label + patient full name + time served. |

### Public mode (no login, dashboard token in URL)
| Section | Content |
|---|---|
| Current turno | Turno label only (e.g. `D-12`), displayed large. No patient name. |
| Waiting queue | Ordered list of turno labels only. No patient names. |
| Recently served | Not shown in public mode. |

Patient personal data (name, age, phone, address) is **never exposed** in public mode.

---

## Queue operations

All queue operations require confirmation from the staff before executing. No action is immediate — a confirmation dialog appears first.

### Next (advance queue in order)
Promotes the next `WAITING` turno by `areaOrder ASC` to `CALLED`.

```
Staff presses "Next"
    → confirmation dialog: "Call next patient? [Cancel] [Confirm]"
    → on confirm: POST /api/brigades/[id]/areas/[areaId]/next
        Transaction:
          1. Current CALLED turno → SERVED, servedAt = now()
          2. Next WAITING turno (lowest areaOrder) → CALLED, calledAt = now()
          3. If no WAITING turnos → current turno → SERVED, no new CALLED turno
        Commit
    → Realtime broadcasts changes to area dashboard + director overview
```

### Call specific turno (out of order)
Staff selects any `WAITING` turno from the queue list and calls it directly.

```
Staff taps a specific turno in the waiting list
    → confirmation dialog: "Call [D-12] out of order? [Cancel] [Confirm]"
    → on confirm: POST /api/brigades/[id]/areas/[areaId]/turnos/[turnoId]/call
        Transaction:
          1. If a CALLED turno exists → SERVED, servedAt = now()
          2. Selected turno → CALLED, calledAt = now()
        Commit
    → Realtime broadcasts changes
```

### Move to end
Patient was not present when called. Turno returns to the tail of the `WAITING` queue.

```
Staff presses "Move to end" on the current CALLED turno
    → confirmation dialog: "Move [D-12] to end of queue? [Cancel] [Confirm]"
    → on confirm: POST /api/brigades/[id]/areas/[areaId]/turnos/[turnoId]/move
        Transaction:
          1. Current CALLED turno → WAITING, movedCount + 1
             areaOrder stays unchanged — queue sorted by areaOrder ASC
             so this turno naturally falls to the tail since it has
             the lowest areaOrder among WAITING but was already processed
          
          ⚠️ IMPORTANT: To place the turno at the TRUE tail, areaOrder
             is updated to MAX(area_order in area) + 1 on move.
             This ensures it sorts after all currently WAITING turnos.
          
          2. Next WAITING turno (new lowest areaOrder) → CALLED, calledAt = now()
          3. If no other WAITING turnos → queue is empty, no new CALLED turno
        Commit
    → Realtime broadcasts changes
```

### Remove
Patient never showed up. Turno is permanently removed from the queue.

```
Staff presses "Remove" on the current CALLED turno
    → confirmation dialog: "Remove [D-12] from queue? This cannot be undone. [Cancel] [Confirm]"
    → on confirm: POST /api/brigades/[id]/areas/[areaId]/turnos/[turnoId]/remove
        Transaction:
          1. Current CALLED turno → REMOVED
          2. Next WAITING turno (lowest areaOrder) → CALLED, calledAt = now()
          3. If no WAITING turnos → queue is empty
        Commit
    → Realtime broadcasts changes
```

---

## Supabase Realtime integration

### What subscribes to what

| Dashboard | Supabase channel | Table filter | Triggers on |
|---|---|---|---|
| Area dashboard | `area-queue-{areaId}` | `area_id=eq.{areaId}` | Any `turnos` change for this area |
| Director overview | `brigade-overview-{brigadeId}` | `brigade_id=eq.{brigadeId}` | Any `turnos` or `patients` change for this brigade |

### Subscription pattern

Both dashboards use `postgres_changes` to listen for `INSERT`, `UPDATE`, and `DELETE` events. On any change, React Query's cache is invalidated for the relevant queries. The UI re-fetches fresh data from the API rather than applying the raw payload directly — this avoids partial-update bugs and keeps the UI consistent with full server state.

```typescript
// lib/realtime/useAreaQueue.ts
const channel = supabase
  .channel(`area-queue-${areaId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'turnos',
      filter: `area_id=eq.${areaId}`,
    },
    (_payload) => {
      queryClient.invalidateQueries({ queryKey: ['queue', areaId] });
    }
  )
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

### Connection loss handling

If the WebSocket connection drops, the dashboard displays a visible error banner:

```
"Connection lost. Please reload the page to continue."
```

There is no automatic reconnection in v1. Staff must reload manually. The banner must be clearly visible and must not block the current turno display — staff should still be able to see the last known state while deciding whether to reload.

The connection status is tracked via the Supabase channel system event:

```typescript
channel.on('system', { event: 'CHANNEL_ERROR' }, () => {
  setConnectionStatus('error');
});

channel.on('system', { event: 'SUBSCRIBED' }, () => {
  setConnectionStatus('connected');
});
```

---

## Director overview — realtime metrics

The director overview subscribes to the entire brigade's turno and patient streams. It aggregates and displays:

- Total patients registered in the brigade.
- Per-area breakdown: patients served, waiting, and removed.
- Average time from `calledAt` to `servedAt` per area (shown as minutes).
- Turno throughput over time — Recharts `LineChart` bucketed in 15-minute intervals.
- Areas at or near their `patientLimit` (highlighted when ≥ 80% capacity).

All metrics are derived from the `turnos` and `patients` tables. No pre-aggregated summary tables exist in v1.
