# Cloud Backup Support Access

Cloud Backup has no accounts. A vault's recovery key is the only way back to its
backup, and there is no password reset. Support access is the single safety net
for a user who loses that key, and it is gated by one Worker secret,
`CLOUD_BACKUP_ADMIN_TOKEN`.

This document is for whoever answers those requests, and for whoever configures
the Worker. The user-facing side of the feature is described in the app's own
help; the design and its constraints live in `specs/162-cc-cloud-backup/`.

## What The Token Is

A single shared bearer credential for two support routes. It is **not** a user
credential and never appears in the browser build.

What it can do:

- Look up **one** backup's metadata — title, size, last-backup time — by exact
  vault title.
- Issue that backup a fresh ownership code.
- Read aggregate totals across every backup — vault count, asset count, total
  stored bytes — with no per-vault detail in the response at all.

What it cannot do, because the routes do not exist:

- Read, download, or restore a vault's contents.
- List backups, or browse by partial title.
- Return more than one backup's identifying detail in a single response.

## Configure The Worker

The token is closed by default. With no secret set, `isAdmin()` refuses every
request and both admin routes behave exactly as if they did not exist. Leave it
unset until support actually needs it.

```bash
cd apps/workers/oracle-proxy
wrangler secret put CLOUD_BACKUP_ADMIN_TOKEN
```

Use a long random value, for example `openssl rand -hex 32`. Never place it in
`wrangler.toml`, web environment variables, or repository variables — anything
in the web build reaches every visitor.

Confirm what is set with `wrangler secret list`. Secrets survive deployments;
`wrangler deploy` never deletes them.

### Rotation

Replace it by running `wrangler secret put CLOUD_BACKUP_ADMIN_TOKEN` again. The
new value takes effect on the next deployment of the secret and immediately
invalidates the old one. There is no per-person token and no audit trail, so
rotate whenever someone who held it stops needing it.

## Runbook: A User Has Lost Their Recovery Key

**Before anything else**: what you can see is a vault's title, size and
last-backup time. Never its contents.

### 1. Get an identifying detail

Currently that means the vault's **exact title**. If the user cannot supply one,
stop. The backup is unreachable, and saying so plainly is kinder than implying
it might be recovered later.

### 2. Look it up

```bash
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev/api/cloud-backup/admin/lookup \
  -H "Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vaultTitle": "The Saltmere Fens"}'
```

- `{"matched": true, "backupId": "...", "vaultTitle": "...", "sizeBytes": 123, "lastPushedAt": "..."}` — exactly one backup matched.
- `{"matched": false}` — **either** nothing matched **or** several did.

That ambiguity is deliberate. Returning "three vaults share this title" would
turn the lookup into a way of counting other people's backups, so zero matches
and several matches are one response. Ask for a different detail; never guess
between candidates.

A `404` means the token is wrong or unset, not that the backup is missing.

### 3. Verify identity

Through your normal support process, **before** re-issuing anything. A vault
title is not proof of ownership — anyone who has seen the user's screen knows
it, and step 4 locks out whoever holds the current code.

### 4. Re-issue the code

```bash
curl -X POST https://oracle-proxy.espen-erlandsen.workers.dev/api/cloud-backup/admin/$BACKUP_ID/reissue-code \
  -H "Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN"
```

Returns `{"ownerCode": "..."}`.

This **invalidates the previous code immediately**. If the user later finds
their original, it will not work. Tell them that as part of the handover, or
they will assume something is broken.

### 5. Give them a recovery key, not just the code

The app asks for a **recovery key**, which is the backup id and the ownership
code joined by a colon:

```
{backupId}:{ownerCode}
```

Both halves are in what you already have — the `backupId` from step 2, the
`ownerCode` from step 4. Sending only the code leaves the user unable to
restore, because nothing in the app displays a backup id on its own.

Relay it through the same channel you verified them on, and remind them it is
the only key to that backup.

## Runbook: Deleting A Stored Vault

A vault owner can always delete their own backup from **Settings → Cloud
Backup → Delete backup**. That is the normal path and needs no operator: the
app holds the backup id and code locally and authorises the delete itself.

The operator route exists for the cases the owner path cannot reach — the user
cleared their browser or lost the device and no longer has the code, a takedown
request, or an abandoned backup that has to go.

```bash
curl -X DELETE https://oracle-proxy.espen-erlandsen.workers.dev/api/cloud-backup/admin/$BACKUP_ID \
  -H "Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN"
```

```json
{ "deleted": true, "existed": true }
```

`existed: false` means the id was already gone — the erase still ran and is
still safe, you were just handed a stale id. Get `$BACKUP_ID` from the lookup
in step 2 above; there is deliberately no delete-by-title.

This is irreversible and there is no undo, no retention window and no copy
elsewhere. Verify identity exactly as you would before re-issuing a code, and
prefer walking the user through deleting it themselves when they still can.

## Checking Overall Usage

`GET /api/cloud-backup/admin/stats` returns aggregate counts only:

```bash
curl https://oracle-proxy.espen-erlandsen.workers.dev/api/cloud-backup/admin/stats \
  -H "Authorization: Bearer $CLOUD_BACKUP_ADMIN_TOKEN"
```

```json
{
  "vaultCount": 42,
  "assetCount": 118,
  "totalBytes": 933184512,
  "complete": true
}
```

A minimal page at `/admin/cloud-backup` calls the same route and renders the
same four fields — nothing more. `complete: false` means the bucket is large
enough that the scan hit its safety cap; the numbers are then a floor, not the
true total, rather than the route silently paginating into an unbounded walk.

This route walks the whole `cloud-backup/` prefix, unlike the lookup above,
because summed totals carry no identifying information — an operator learns
"how many" and "how big", never "which ones". It still cannot be extended to
return a title, a backup id, or any other per-vault field without reopening
the door FR-016 closes; treat that boundary as fixed, not as a starting point.

## What To Refuse

Any request to list backups, to browse by partial title, to read a vault's
contents, or to add per-vault detail to the stats route above. None of those
exist, and none should be built — see FR-016 in `specs/162-cc-cloud-backup/spec.md`.
The lookup also caps its scan and never paginates, for the same reason: an
unbounded walk is bulk enumeration by another name.
