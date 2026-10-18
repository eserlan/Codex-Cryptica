# Contract: POST /api/answer-aggregates/vote

Records one anonymous usefulness vote. Fire-and-forget from the client; failure never blocks UI.

**Request**

```http
POST /api/answer-aggregates/vote
Origin: https://codexcryptica.com
Content-Type: application/json

{ "slug": "how-do-you-run-a-heist-in-a-tabletop-rpg", "value": "yes", "previous": "no" }
```

- `slug` (required): registry-validated answer slug.
- `value` (required): `yes` | `no`.
- `previous` (optional): the browser's prior vote for this slug (from localStorage marker). Enables move-not-add.

**Responses**

- `200 { "ok": true, "moved": true|false }` — recorded (or no-op when `previous === value`).
- `400 { "error": "invalid_request" }` — bad `value`/shape.
- `404 { "error": "unknown_slug" }` — slug fails allowlist; nothing written.
- `429 { "error": "rate_limited" }` — per-IP budget exceeded (`Retry-After: 60`).
- `403` — disallowed Origin on writes (same helper as generator-shares).

**Server behaviour**

- Atomic upsert (see data-model.md). `previous` present and different → decrement previous bucket (floor 0), increment value bucket, single `updated_at` bump.
- Never persists IP, user-agent, or reason. Rate-limiter key is ephemeral.
- No auth, no cookies.

**Tests (contract)**: unknown slug → 404 + zero rows; bad value → 400; fresh yes → row `yes=1`; change no→yes → `no=0,yes=1,moved=true`; same-value repeat → unchanged; 6th write in 60s window from one IP → 429.
