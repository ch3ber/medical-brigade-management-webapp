# Runbooks

Operational guides for incidents and common issues in the Medical Brigade Management Web App.

Each runbook has two versions:

- **English** (`docs/runbooks/`) — for developers and AI assistants. Includes SQL queries, API details, and technical root cause analysis.
- **Spanish** (`docs/runbooks/es/`) — for brigade directors and staff. Plain language, no technical jargon, focused on immediate steps.

---

## Critical — use during a live brigade

| #   | Runbook (EN)                                               | Guía (ES)                                                     | When                                                      |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| 01  | [WebSocket Disconnection](./01-websocket-disconnection.md) | [Desconexión del dashboard](./es/01-desconexion-websocket.md) | Dashboard shows connection error or stops updating        |
| 02  | [Queue Stuck](./02-queue-stuck.md)                         | [Cola trabada](./es/02-cola-trabada.md)                       | Current turno won't advance despite staff actions         |
| 03  | [Patient Duplicate](./03-patient-duplicate.md)             | [Paciente duplicado](./es/03-paciente-duplicado.md)           | Patient was registered more than once in the same brigade |
