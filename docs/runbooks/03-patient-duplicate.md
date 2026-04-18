# Runbook 03 — Patient Registered Twice (Duplicate Record)

**Audience:** Developers and AI assistants  
**Severity:** Low — no data loss, no queue disruption, requires manual cleanup  
**When to use:** A patient was registered more than once in the same brigade, creating duplicate records and extra turnos in one or more areas

---

## What happens

Two patient records exist for the same physical person within the same brigade. Each record has its own `globalOrder` and its own set of area turnos. If both records have active `WAITING` or `CALLED` turnos in the same area, that area's queue has a ghost turno that will never be served by the real patient.

---

## Symptoms

- Staff or director notices two entries with the same name in the patient list.
- A patient reports being called twice or holding two tickets for the same area.
- An area queue shows a turno for a patient who is already being served under a different turno number.

---

## Immediate steps (during a live brigade)

### Step 1 — Identify the duplicate records

From the director overview, go to the patient list and search by name. Note:

| Field | Record A (keep) | Record B (remove) |
|---|---|---|
| `id` | | |
| `globalOrder` | lower number (arrived first) | higher number |
| `createdAt` | earlier | later |
| Turnos | check status per area | check status per area |

The record to **keep** is the one with the lower `globalOrder` (registered first). The record to **remove** is the duplicate.

### Step 2 — Resolve active turnos on the duplicate record

Before removing the duplicate patient, cancel all its active turnos (`WAITING` or `CALLED`).

**Via the UI (preferred):**
Navigate to the duplicate patient's record and remove all their active area turnos using the "Remove" action on the queue dashboard for each affected area.

**Via Supabase SQL editor (if UI is too slow during a live brigade):**

```sql
-- Find all active turnos for the duplicate patient
SELECT
  t.id,
  t.area_order,
  t.status,
  a.name AS area_name,
  a.prefix
FROM turnos t
JOIN areas a ON a.id = t.area_id
WHERE t.patient_id = '[duplicatePatientId]'
  AND t.status IN ('WAITING', 'CALLED');
```

Cancel them:

```sql
-- Cancel all active turnos for the duplicate patient
UPDATE turnos
SET status = 'REMOVED', updated_at = NOW()
WHERE patient_id = '[duplicatePatientId]'
  AND status IN ('WAITING', 'CALLED');
```

If any of the duplicate's turnos were `CALLED`, promote the next `WAITING` turno in that area:

```sql
-- Promote next WAITING turno to CALLED for each affected area
-- Run once per affected areaId
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

### Step 3 — Mark the duplicate patient record as removed

There is no hard delete for patient records — instead, add a note to the duplicate record to flag it as a duplicate. Update the `notes` field:

```sql
UPDATE patients
SET
  notes = '[DUPLICADO] Registro duplicado. Ver paciente ID: [keepPatientId]',
  updated_at = NOW()
WHERE id = '[duplicatePatientId]';
```

### Step 4 — Verify the correct record has the right areas

Check the patient record that is being kept. If the patient needed an area that was only registered on the duplicate record, add it now:

```sql
-- Check which areas the kept patient has turnos for
SELECT
  t.id,
  t.area_order,
  t.status,
  a.name AS area_name,
  a.prefix,
  a.prefix || '-' || t.area_order AS label
FROM turnos t
JOIN areas a ON a.id = t.area_id
WHERE t.patient_id = '[keepPatientId]';
```

If a needed area is missing, use the "Add patient to area" feature from the patient's record in the UI — or insert via SQL using the same advisory lock pattern described in `architecture/03-database-schema.md`.

### Step 5 — Notify the patient

Let the patient know their correct turno number(s) so they can continue waiting in the right area(s).

---

## Verification

After cleanup:
1. Searching the patient's name in the brigade shows one active record and one flagged as `[DUPLICADO]`.
2. The kept record has correct turnos for all needed areas.
3. No area queue has a `WAITING` or `CALLED` turno belonging to the duplicate record.
4. The `globalOrder` counter was not affected — it only increments, never resets.

---

## Impact on global order counter

The `globalOrder` of the duplicate record is permanently "used" — the counter does not roll back. This is by design. If `globalOrder` 47 was the duplicate and 48 was the next real patient, the sequence will show a gap at 47 in reports. This is acceptable and expected.

---

## Prevention

The UI does not currently prevent duplicate registration. A future improvement is to add a name-based fuzzy search warning during patient intake that alerts staff if a patient with a similar name already exists in the brigade.
