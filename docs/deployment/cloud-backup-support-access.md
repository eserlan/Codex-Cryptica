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

What it cannot do, because the routes do not exist:

- Read, download, or restore a vault's contents.
- List backups, or browse by partial title.
- Return more than one backup in a single response.

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

## What To Refuse

Any request to list backups, to browse by partial title, or to read a vault's
contents. None of those exist, and none should be built — see FR-016 in
`specs/162-cc-cloud-backup/spec.md`. The lookup also caps its scan and never
paginates, for the same reason: an unbounded walk is bulk enumeration by
another name.
