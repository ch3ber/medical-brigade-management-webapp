# 04 — Auth and Roles

## Authentication provider

Supabase Auth handles all authentication. Sessions are JWT-based and managed via HTTP-only cookies using the `@supabase/ssr` package. No custom auth server. No NextAuth. No third-party identity provider in v1.

---

## User types and roles

The app has two independent role layers that work together.

### 1. App-level role (`profiles.role`)

Assigned globally. Determines what a user can do across the entire platform.

| Role               | Who                 | How they are created                                             |
| ------------------ | ------------------- | ---------------------------------------------------------------- |
| `PLATFORM_ADMIN`   | Internal team       | Manually set directly in the DB. Never via the UI.               |
| `BRIGADE_DIRECTOR` | Any registered user | Default role on sign-up. Open registration — no invite required. |

### 2. Brigade-level role (`brigade_members.role`)

Assigned per brigade. A user can have different roles in different brigades simultaneously.

| Role          | Who                                                 | Permissions summary                                |
| ------------- | --------------------------------------------------- | -------------------------------------------------- |
| `DIRECTOR`    | The user who created the brigade (auto-assigned)    | Full control over the brigade                      |
| `CO_DIRECTOR` | An existing registered user invited by the director | Same permissions as director within that brigade   |
| `STAFF`       | Anyone added by the director (registered or not)    | Register patients, operate queues, view dashboards |

---

## Permission matrix

| Action                                      | Platform admin | Director (own brigade) | Co-director (own brigade) | Staff (own brigade) | Unauthenticated |
| ------------------------------------------- | -------------- | ---------------------- | ------------------------- | ------------------- | --------------- |
| Register as new user                        | —              | ✅ open                | ✅ open                   | —                   | ✅              |
| Create brigade                              | —              | ✅                     | ✅                        | ❌                  | ❌              |
| Edit brigade settings                       | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Open / close brigade                        | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Add / edit / delete areas                   | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Clone brigade or areas                      | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Invite staff (credentials or link)          | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Edit / remove staff members                 | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Configure staff access after brigade closes | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| Register patients                           | ✅             | ✅                     | ✅                        | ✅                  | ❌              |
| Add patient to additional area              | ✅             | ✅                     | ✅                        | ✅                  | ❌              |
| Operate queue (next, move, remove)          | ✅             | ✅                     | ✅                        | ✅                  | ❌              |
| View area dashboard (authenticated)         | ✅             | ✅                     | ✅                        | ✅                  | ❌              |
| View area dashboard (public mode)           | ✅             | ✅                     | ✅                        | ✅                  | ✅ (if enabled) |
| View director overview                      | ✅             | ✅                     | ✅                        | ❌                  | ❌              |
| View closed brigade data                    | ✅             | ✅                     | ✅                        | Configurable        | ❌              |
| Access all brigades on platform             | ✅             | ❌                     | ❌                        | ❌                  | ❌              |

---

## Authentication flows

### 1. Director sign-up

Any person can register as a brigade director. Two methods are available:

```
User visits /register
    ├─ Email + password → Supabase creates account → email verification →
    │   session created → DB trigger creates profile (role: BRIGADE_DIRECTOR) →
    │   redirect to /dashboard
    │
    └─ Magic link → user enters email → Supabase sends link →
        user clicks link → session created → DB trigger creates profile →
        redirect to /dashboard
```

### 2. Director login

```
User visits /login
    ├─ Email + password → Supabase validates → session cookie set →
    │   middleware confirms session → redirect to /dashboard
    │
    └─ Magic link → user enters email → Supabase sends link →
        user clicks → session cookie set → redirect to /dashboard
```

### 3. Staff login — invite link (existing registered user)

```
Director sends invite link: /invite/[token]
    │
User opens link
    ├─ Already logged in →
    │   API validates token → links brigade_members.profile_id →
    │   sets acceptedAt → redirect to brigade dashboard
    │
    └─ Not logged in →
        login/register flow (email+password or magic link) →
        after session created → token consumed → profileId linked →
        redirect to brigade dashboard
```

### 4. Staff login — generated credentials (non-registered staff)

```
Director generates username + password from director panel →
API creates brigade_members row (generatedUsername, generatedPasswordHash) →
Director shares credentials with staff member out of band

Staff visits /login →
enters generated username + password →
API validates against brigade_members.generatedPasswordHash →
creates a scoped session tied to that brigade_members row →
redirect to brigade dashboard
```

> Generated-credential sessions are brigade-scoped. Staff with generated credentials can only access the brigades they were added to. They do not have a `profiles` row until they choose to convert to a full account.

### 5. Public area dashboard (no login required)

```
Director enables public mode for a brigade in brigade settings →
System generates a public dashboard token per area →
Public URL: /public/[brigadeId]/areas/[areaId]?token=[dashboardToken]

Anyone with the URL can view:
  - Current CALLED turno number (prefix + areaOrder, e.g. "D-12")
  - Waiting queue (turno numbers only, no patient names)

Patient personal data is never exposed on public dashboards.
```

---

## Session management

- Sessions are stored in HTTP-only cookies managed by `@supabase/ssr`.
- Multiple devices can be logged in simultaneously — each device holds its own session token.
- Logging out on one device invalidates only that device's session token via `supabase.auth.signOut({ scope: 'local' })`.
- There is no "log out everywhere" feature in v1.

### Middleware route protection

`middleware.ts` runs on every request and handles two responsibilities:

1. **Session refresh** — calls `supabase.auth.getSession()` to rotate the JWT if it is near expiry.
2. **Route protection** — redirects unauthenticated users away from protected routes.

```
Request → middleware.ts
    ├─ /dashboard/** → no valid session → redirect /login
    ├─ /invite/[token] → allow through (page handles auth state)
    ├─ /public/** → allow through (no auth required)
    └─ Everything else → allow
```

---

## Staff access after brigade closes

The director controls post-close access per staff member via a toggle in the brigade members panel. The setting is stored as `brigade_members.retainAccessAfterClose` (boolean, default `false`).

| `retainAccessAfterClose` | Behavior after brigade closes                                             |
| ------------------------ | ------------------------------------------------------------------------- |
| `false` (default)        | Staff session is valid but API returns `403` on all brigade data requests |
| `true`                   | Staff retains full read access to the closed brigade                      |

Directors and co-directors always retain read access to closed brigades regardless of this setting.

---

## Platform admin

Platform admins are created by manually updating `profiles.role` to `PLATFORM_ADMIN` directly in the Supabase dashboard or via a migration script. There is no UI for this. Platform admin accounts should be protected with a strong password and are not intended for regular use.

Platform admins bypass all RLS brigade-membership checks via a Supabase RLS policy:

```sql
-- Example: platform admins can read any brigade
CREATE POLICY "Platform admins read all brigades"
ON brigades FOR SELECT
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'PLATFORM_ADMIN'
);
```

---

## Security notes

- Generated staff passwords are hashed with `bcrypt` (cost factor 12) before storage. Plain-text passwords are never persisted.
- Public dashboard tokens are UUIDs generated at brigade activation. They can be regenerated by the director at any time, which invalidates all existing public URLs for that brigade.
- RLS policies are the final enforcement layer. API-layer permission checks are a UX convenience, not the security boundary.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in server-side API routes that require bypassing RLS (e.g. admin operations, generated credential validation). It is never sent to the browser.
