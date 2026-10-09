# Contract: GET /api/answer-aggregates/top + /by-slugs

Public, anonymous, edge-cached reads. Only above-threshold slugs ever appear.

## GET /api/answer-aggregates/top

```http
GET /api/answer-aggregates/top?limit=6
```

- `limit` optional int 1–10, default 6.
- Response (`Cache-Control: public, max-age=300`):

```json
{ "items": [{ "slug": "how-do-you-run-a-heist-in-a-tabletop-rpg", "yes": 24 }] }
```

- Ordering: score (`yes DESC → ratio DESC → slug ASC`), server-side.
- `items` may be empty (cold start) — client hides the section unless `items.length >= 4` (quorum enforced client-side too, defence in depth).
- CORS: public read — same treatment as `GET /api/generator-shares/:id` (no Origin gate).

## GET /api/answer-aggregates/by-slugs

```http
GET /api/answer-aggregates/by-slugs?slugs=slug-a,slug-b,slug-c
```

- `slugs`: 1–10 comma-separated registry-format slugs. Unknown/below-threshold slugs silently omitted.
- Response (`Cache-Control: public, max-age=300`):

```json
{ "items": [{ "slug": "slug-a", "yes": 12 }] }
```

- Used by answer pages for the per-article helpfulness line (`yes >= 10` guaranteed by server filter; client re-checks before rendering).

**Tests (contract)**: seeded rows (12, 9, 30 yes) → top returns only 30+12 in order, omits 9; limit=1 → single top row; by-slugs with mixed known/unknown/below-threshold → only eligible returned; responses carry `max-age>=300` and no `no`/`views`/identity fields.
