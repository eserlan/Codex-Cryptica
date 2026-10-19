# Contract: `POST /api/feedback/reports` (v1)

Worker: `apps/workers/oracle-proxy`. Schemas are in `packages/feedback-engine` (see [data-model.md](../data-model.md)).

## Request

```http
POST /api/feedback/reports
Origin: https://codexcryptica.com
Content-Type: application/json
```

```json
{
  "schemaVersion": 1,
  "submissionId": "3f0c2b1e-8d4a-4c6b-9e2f-1a2b3c4d5e6f",
  "kind": "problem",
  "description": "I was rolling initiative on the tabletop. The tracker stayed empty.",
  "contactEmail": "gm@example.com",
  "meta": {
    "appVersion": "0.36.0",
    "area": "tabletop",
    "browser": "firefox",
    "screen": "narrow"
  }
}
```

- The `Origin` header must be on the worker's allowlist (`cors.ts`). A missing or other origin gets `403 forbidden_origin`.
- `OPTIONS` preflight is handled by the existing `handleCorsPreflight`.
- Bodies over 16 KB get `400 invalid`, checked before parsing.
- Requests are handled in this order, and each step stops on failure:
  1. origin
  2. size
  3. parse and strict schema
  4. honeypot
  5. configuration present
  6. burst limiter
  7. submission marker
  8. hourly and daily quota
  9. GitHub delivery
  10. marker set to delivered

  If step 8 or 9 fails, the marker claimed in step 7 is deleted, and any quota slot reserved in step 8 is released, before the response is sent.

## Responses

| Status | Body                                                                       | When                                                           |
| ------ | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 201    | `{ "reference": "CC-7F3K-9Q2M" }`                                          | A new report was delivered                                     |
| 200    | `{ "reference": "CC-7F3K-9Q2M" }`                                          | Repeat of a delivered `submissionId`; same reference           |
| 400    | `{ "error": { "code": "invalid", "message": "…" } }`                       | Contract violation, honeypot, oversized                        |
| 403    | `{ "error": { "code": "forbidden_origin", … } }`                           | Origin                                                         |
| 409    | `{ "error": { "code": "in_progress", … } }`                                | The same `submissionId` is being delivered                     |
| 429    | `{ "error": { "code": "rate_limited", … } }` plus `Retry-After: <seconds>` | 5 per minute, 5 per hour or 20 per day from one source         |
| 503    | `{ "error": { "code": "unavailable" \| "misconfigured", … } }`             | GitHub failed, or the token, repository or hash key is missing |

Every response carries the CORS headers for an allowed origin and `Cache-Control: no-store`. No response contains the issue number, a GitHub URL, the repository name, upstream error text, the source hash or any secret.

## Triage issue (worker → GitHub)

```http
POST https://api.github.com/repos/{FEEDBACK_GITHUB_REPO}/issues
Authorization: Bearer {FEEDBACK_GITHUB_TOKEN}
Accept: application/vnd.github+json
X-GitHub-Api-Version: 2022-11-28
```

```json
{
  "title": "[Problem] CC-7F3K-9Q2M",
  "labels": ["report:problem"],
  "body": "…rendered by renderTriageIssue…"
}
```

Body layout, built from allowlisted values only (R2):

````markdown
**Kind:** Problem
**Reference:** CC-7F3K-9Q2M
**Received:** 2026-10-19T15:04:05Z
**App version:** 0.36.0
**Area:** tabletop
**Browser:** firefox
**Screen:** narrow

### Description

```text
I was rolling initiative on the tabletop. The tracker stayed empty.
```

### Contact

```text
gm@example.com
```
````

The Contact section is omitted when no email was given. The fence length is chosen per block (R2).

The worker treats any non-2xx response from GitHub as a definite refusal: it gives the quota back and clears the marker. A network error or a timeout of more than 8 seconds is an unknown outcome: it returns `unavailable`, keeps the marker and the quota slot, so a quick retry gets `in_progress` rather than a second issue. It logs only the outcome metric, never GitHub's response body.

## Worker configuration

| Name                    | Kind                | Purpose                                                                        |
| ----------------------- | ------------------- | ------------------------------------------------------------------------------ |
| `FEEDBACK_GITHUB_TOKEN` | secret              | Fine-grained PAT: one private repository, Issues read and write                |
| `FEEDBACK_GITHUB_REPO`  | var                 | `owner/name` of the private triage repository                                  |
| `FEEDBACK_HASH_KEY`     | secret              | HMAC key for the source and submission hashes                                  |
| `FEEDBACK_RATE_LIMITER` | ratelimit binding   | 5 per 60 s, keyed by the source hash                                           |
| `BUCKET`                | existing R2 binding | Quota counters and submission markers under `feedback/` (2-day lifecycle rule) |

If `FEEDBACK_GITHUB_TOKEN`, `FEEDBACK_GITHUB_REPO` or `FEEDBACK_HASH_KEY` is missing, the response is `503 misconfigured`, never a success (FR-019).

## Client entry point (web)

```ts
feedbackDialog.open({
  kind?: FeedbackKind,
  description?: string,
  area?: FeedbackArea,
}): void
```

Defined in `apps/web/src/lib/stores/ui/feedback-dialog.svelte.ts`. Callers pre-fill fields; the user reviews and edits everything, and nothing is sent until they press Submit (FR-006, FR-011). Later features use the same function: Cif handoff (#4230) and diagnostics (#4231).
