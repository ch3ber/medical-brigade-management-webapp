# 01 — Project Overview

## What problem this solves

Medical brigade teams currently manage patient flow with paper lists and verbal coordination. This creates lost turnos, confusion between areas, and no visibility for the director into what is happening across the brigade in real time.

This app replaces that process with a digital system: patients are registered once, receive a physical ticket printed or shown from the app, and each medical area has a live queue dashboard that staff operate independently.

---

## Core concepts

### Brigade

A single-day medical event organized by a director. A brigade has a defined lifecycle: it is created, opened manually by the director, operated during the day, and closed manually at the end. Once closed, it becomes read-only. All data (patients, areas, turnos) is scoped to a brigade and never shared with other brigades.

| Status   | Meaning                                                                                                                    |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DRAFT`  | Brigade created, being configured. No patient registration yet.                                                            |
| `ACTIVE` | Brigade opened manually by the director. Patient registration and queue management are live. Timestamp recorded in the DB. |
| `CLOSED` | Brigade closed manually by the director. All data is read-only. Timestamp recorded in the DB.                              |

### Area

A medical station within a brigade (e.g. Dentistry, Nursing, Ophthalmology, General Medicine). Areas are created and managed exclusively by the brigade director. Areas can be added or edited at any point — including while the brigade is active. Each area has its own independent queue of turnos.

### Patient

A person registered during an active brigade. Registration captures the following fields:

| Field                     | Required      |
| ------------------------- | ------------- |
| Full name                 | Yes           |
| Age                       | Yes           |
| Gender                    | Yes           |
| Phone number              | Yes           |
| Address                   | Yes           |
| Target area (first area)  | Yes           |
| Would like a church visit | Yes (boolean) |

A patient is scoped to a single brigade. The same physical person attending two different brigades is stored as two separate, independent patient records — there is no cross-brigade identity matching.

A patient can be attended in multiple areas within the same brigade. Each area visit generates its own turno.

### Turno

A shift ticket assigned to a patient. There are two types:

**Global turno** — assigned once at registration. Represents the patient's order of arrival to the brigade across all areas. Used only for tracking and reporting (e.g. "patient #47 arrived today").

**Area turno** — assigned each time a patient is added to an area's queue. Represents their position within that specific area. This is the number printed on the physical ticket given to the patient.

A patient attending three areas in one brigade will have 1 global turno and 3 area turnos.

### Queue

The ordered list of area turnos waiting to be served in a specific area. The queue is managed by the area's staff in real time. Each area's queue is independent from all other areas.

---

## User types

### Platform Admin

Internal role. Full read and write access across all brigades and all data. Used for support and maintenance only.

### Brigade Director

Any registered user can be a brigade director. They own and control their brigades. A director can:

- Create brigades and configure areas.
- Manage staff: invite registered users or generate credentials for non-registered staff directly from the director panel.
- Edit or remove any staff member from their brigade.
- Open and close the brigade.
- Monitor the full brigade dashboard in real time.
- Intervene in any area queue (reassign, move to end, remove a turno).

### Brigade Staff

A person operating within a specific brigade. Staff do **not** need to be pre-registered users. The director can generate credentials for them directly from the director panel, or invite an existing registered user. Staff can:

- Register incoming patients and assign them to an area.
- Operate the queue in their assigned area (call next, move to end, remove).
- View the area dashboard.

Staff credentials and permissions are managed entirely by the brigade director.

---

## User flows

### 1. Director sets up a brigade

1. Director logs in and creates a new brigade (name, date, location).
2. Configures areas for that brigade (name, color, display order).
3. Creates or invites staff members:
   - **Option A** — generates credentials (username + password) from the director panel for staff who do not have an account.
   - **Option B** — sends an invite link to an existing registered user.
4. When ready to start the event, director opens the brigade. The `ACTIVE` status and timestamp are recorded.

### 2. Staff registers a patient

1. Staff logs in (with director-generated credentials or their own account).
2. Opens the active brigade and goes to patient intake.
3. Fills in patient form: name, age, gender, phone, address, church visit preference, and one or more target areas.
4. Staff can assign the patient to multiple areas at registration time — there is no limit.
5. System creates the patient record and generates turnos automatically:
   - **Global turno**: `MAX(global_order in brigade) + 1` — assigned once at registration, never changes.
   - **Area turno**: one per selected area, each `MAX(area_order in area) + 1` — sequential within each area.
6. The area turno numbers are shown on screen so staff can write or print a physical ticket per area for the patient.
7. The patient joins the tail of each selected area's queue with status `WAITING`.

**Simultaneous turnos across areas are by design.** The system does not validate or prevent a patient from having active turnos in multiple areas at the same time. It is the patient's responsibility to manage their own time between areas. If turno 5 is called in Dentistry and Nursing at the same moment for the same patient, the system does not intervene.

### 3. Staff adds a patient to an additional area after registration

If a patient wants to visit an area they were not originally assigned to, they must return to reception. Staff searches for their existing record in the current brigade and adds the new area from the patient's profile. A new area turno is generated and the patient joins that area's queue. The global turno does not change.

### 4. Area staff operates the queue

The area dashboard is open on a tablet or screen visible to staff. The flow is entirely physical — the system shows who is next, staff calls the name or number out loud.

```
Staff sees current CALLED turno on dashboard
    │
    ├─ Patient is present
    │       └─ Staff taps "Attended" → turno → SERVED
    │                                → next WAITING turno → CALLED
    │
    ├─ Patient is not present
    │       └─ Staff taps "Move to end" → turno stays WAITING, area_order updated to tail
    │                                   → next WAITING turno → CALLED
    │
    └─ Patient never showed up
            └─ Staff taps "Remove" → turno → REMOVED (permanently out of queue)
```

Only one turno per area can have status `CALLED` at any given time.

### 5. Director monitors the brigade

1. Director views the brigade overview dashboard: patients registered, turnos served vs waiting per area, throughput over time.
2. Director can navigate to any area queue and perform any staff action.
3. At the end of the day, director closes the brigade manually. Status → `CLOSED`, timestamp recorded.

---

## Constraints

- Fewer than 50 simultaneous users per brigade.
- Web-first. The UI must be fully responsive for tablets and phones used in the field.
- A native mobile app is planned for a future version. API design must not block that path.
- All times are stored in UTC. Display timezone is `America/Monterrey`.
- There is no offline mode in v1. An internet connection is required to operate.

---

## Out of scope for v1

- Geolocation of brigades or patients.
- Clinical notes, diagnoses, or medical records.
- Cross-brigade patient identity matching.
- Inventory or medication tracking.
- Automated brigade scheduling or recurring brigades.
- Offline mode.
- Native mobile app (web app must be mobile-responsive, but no native build in v1).
