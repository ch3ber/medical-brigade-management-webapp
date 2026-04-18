# Runbook 01 — WebSocket Disconnection During Active Brigade

**Audience:** Developers and AI assistants  
**Severity:** High — area dashboards stop updating in real time  
**When to use:** A dashboard shows the connection error banner or stops reflecting queue changes

---

## What happens

Supabase Realtime uses a persistent WebSocket connection. If the connection drops (network issue, Supabase incident, device sleep, browser tab backgrounded too long), the area dashboard stops receiving live turno updates. The last known state remains on screen but is frozen.

In v1, there is no automatic reconnection. The dashboard displays an error banner and requires a manual page reload.

---

## Impact

| Who is affected        | Impact                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Area dashboard (staff) | Queue updates stop. Staff still sees the last known state but must reload to continue operating.                           |
| Director overview      | Same — metrics freeze until reload.                                                                                        |
| Patient data           | No data loss. All turno state lives in PostgreSQL. A reload fetches fresh state.                                           |
| Queue operations       | Staff can still tap Next/Move/Remove — the API calls succeed — but the dashboard does not reflect the change until reload. |

---

## Immediate steps (during a live brigade)

### Step 1 — Confirm it is a WebSocket issue

The dashboard shows this banner:

```
"Connection lost. Please reload the page to continue."
```

If the banner is not visible but the queue appears frozen, check the browser console for WebSocket errors:

```
WebSocket connection to 'wss://xxxx.supabase.co/realtime/v1/...' failed
```

### Step 2 — Reload the page

Tell the staff member operating the dashboard to reload the page (`F5` or pull-to-refresh on mobile). The page will:

1. Re-establish the Supabase Realtime subscription.
2. Fetch the current queue state fresh from the API.
3. Resume live updates.

This resolves the issue in ~95% of cases.

### Step 3 — If reload does not restore the connection

Check Supabase service status: [status.supabase.com](https://status.supabase.com)

If Supabase Realtime is degraded:

- Staff can continue operating the queue manually — every Next/Move/Remove action still hits the API and updates the database correctly.
- The dashboard will not reflect changes live, but staff can reload periodically (every 1–2 minutes) to see the current state.
- Director can monitor from the overview by reloading manually.

### Step 4 — If the issue is device-specific

- Try a different browser or device.
- Check if the device has a stable internet connection (`ping supabase.co`).
- If on mobile, check if the browser is killing background tabs — keep the tab active.

---

## Verification

After reload, confirm the connection is restored:

1. The error banner is gone.
2. Ask another staff member or the director to advance a turno in a different area.
3. Confirm the dashboard updates within ~2 seconds without a manual reload.

---

## Root cause investigation (post-incident)

Check Supabase Realtime logs in the Supabase dashboard:

```
Supabase Dashboard → Project → Realtime → Logs
```

Check Vercel function logs for any API errors during the same time window:

```
Vercel Dashboard → Project → Functions → Logs
```

Common causes:

- **Network instability** — tablet/phone lost WiFi briefly. Self-resolving after reload.
- **Device sleep** — iOS/Android kills WebSocket connections when the screen locks. Reload on wake.
- **Supabase Realtime incident** — check [status.supabase.com](https://status.supabase.com). No action needed beyond periodic reloads until resolved.
- **Browser tab throttling** — Chromium-based browsers throttle background tabs. Keep the dashboard tab active and visible.

---

## Future improvement (v2)

Add automatic reconnection with exponential backoff instead of requiring a manual reload:

```typescript
channel.on('system', { event: 'CHANNEL_ERROR' }, () => {
  setTimeout(() => channel.subscribe(), 3000) // retry after 3s
})
```

This was intentionally deferred to v1 to keep complexity low.
