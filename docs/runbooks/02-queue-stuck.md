# Runbook 02 — Queue Stuck (Turno Remains CALLED Indefinitely)

**Audience:** Developers and AI assistants  
**Severity:** Medium — one area's queue is blocked, other areas are unaffected  
**When to use:** A turno has been in `CALLED` status for an abnormal amount of time and staff cannot advance the queue

---

## What happens

Only one turno per area can have status `CALLED` at any given time. If a `CALLED` turno cannot be resolved (staff UI unresponsive, network error during an action, or a bug in the queue advancement logic), the area's queue is effectively stuck — no new turno can be called until the current one is resolved.

Patient data and other areas are not affected.

---

## Symptoms

- Staff presses "Next", "Move to end", or "Remove" and nothing happens.
- The same turno label has been displayed as current for an unusually long time.
- The waiting queue shows patients but the current turno never changes.
- The director overview shows the area with 0 served turnos despite activity.

---

## Immediate steps (during a live brigade)

### Step 1 — Rule out a UI issue

Before assuming the queue is stuck in the database, confirm it is not a frontend issue:

1. Reload the area dashboard page.
2. Try the action again (Next / Move to end / Remove).
3. Check the browser console for API errors (`4xx` or `5xx` responses to `/api/v1/brigades/.../next`).

If the API returns an error, note the error code and message — they map to a specific cause in `architecture/07-api-routes.md`.

### Step 2 — Verify the stuck state via the director overview

The director can see all area queues from the brigade overview. Confirm:

- Which turno is `CALLED` (label and patient name).
- How long it has been in that state (`calledAt` timestamp).
- How many turnos are `WAITING` behind it.

### Step 3 — Resolve via the UI (preferred)

If the staff dashboard is accessible, use the director account to navigate directly to the area dashboard and force-resolve the stuck turno:

- **If the patient was attended:** tap "Attended" → turno → `SERVED`, next `WAITING` → `CALLED`.
- **If the patient did not show:** tap "Move to end" → turno rejoins queue tail, next `WAITING` → `CALLED`.
- **If the patient should be removed:** tap "Remove" → turno → `REMOVED`, next `WAITING` → `CALLED`.

### Step 4 — Resolve via Supabase SQL editor (if UI fails)

Open the Supabase dashboard → SQL editor. Run the following to identify the stuck turno:

```sql
-- Find the stuck CALLED turno for a specific area
SELECT
  t.id,
  t.area_order,
  t.status,
  t.called_at,
  NOW() - t.called_at AS time_stuck,
  p.full_name,
  a.name AS area_name
FROM turnos t
JOIN patients p ON p.id = t.patient_id
JOIN areas a ON a.id = t.area_id
WHERE t.status = 'CALLED'
  AND a.brigade_id = '[brigadeId]'
ORDER BY t.called_at ASC;
```

Once identified, resolve it manually. Choose one:

```sql
-- Option A: Mark as SERVED (patient was attended)
UPDATE turnos
SET status = 'SERVED', served_at = NOW(), updated_at = NOW()
WHERE id = '[turnoId]';

-- Option B: Move to tail (patient not present)
UPDATE turnos
SET
  status = 'WAITING',
  area_order = (
    SELECT COALESCE(MAX(area_order), 0) + 1
    FROM turnos
    WHERE area_id = '[areaId]'
  ),
  moved_count = moved_count + 1,
  updated_at = NOW()
WHERE id = '[turnoId]';

-- Option C: Remove (patient will not return)
UPDATE turnos
SET status = 'REMOVED', updated_at = NOW()
WHERE id = '[turnoId]';
```

After resolving the stuck turno, promote the next `WAITING` turno to `CALLED`:

```sql
-- Promote next WAITING turno to CALLED
UPDATE turnos
SET status = 'CALLED', called_at = NOW(), updated_at = NOW()
WHERE id = (
  SELECT id FROM turnos
  WHERE area_id = '[areaId]'
    AND status = 'WAITING'
  ORDER BY area_order ASC
  LIMIT 1
);
```

### Step 5 — Notify the area dashboard

After the SQL update, Supabase Realtime will broadcast the change automatically. The area dashboard should update within ~2 seconds. If it does not, have staff reload the page.

---

## Verification

After resolution, confirm:

1. The area dashboard shows a new `CALLED` turno (or shows the queue as empty if no `WAITING` turnos remain).
2. The director overview reflects the updated counts.
3. Staff can press "Next" and the queue advances normally.

---

## Root cause investigation (post-incident)

Check Vercel function logs for the time window of the incident:

```
Vercel Dashboard → Project → Functions → Logs
Filter by: /api/v1/brigades/[brigadeId]/areas/[areaId]/next
```

Common causes:

- **Network timeout during API call** — the staff tapped "Next", the request timed out, the DB was not updated. Resolved by Step 3 or 4 above.
- **Browser crash mid-request** — same as above.
- **Advisory lock deadlock** — extremely rare. Two simultaneous requests conflicted. The lock times out automatically and both requests fail. Resolved by retrying the action.
- **Bug in queue advancement logic** — if this recurs, add a log to `src/turnos/application/use-cases/call-next-turno.ts` to capture the exact state at the time of failure.
